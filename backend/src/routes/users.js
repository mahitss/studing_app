const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const User = require("../models/User");

const sessionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 session operations per windowMs
  message: { message: "Too many session operations. Uplink throttled." },
  standardHeaders: true,
  legacyHeaders: false
});
const StudySession = require("../models/StudySession");
const DailyGoal = require("../models/DailyGoal");
const AuditLog = require("../models/AuditLog");
const { requireAuth, requireSelf } = require("../middleware/auth");
const trackerService = require("../services/trackerService");
const emailService = require("../services/emailService");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { startSessionSchema, endSessionSchema, offlineSyncSchema } = require("../validations/session.validation");
const { logAction } = require("../utils/auditLogger");
const { dispatchWebhook } = require("../utils/webhookDispatcher");

const signAccessToken = (user) =>
  jwt.sign(
    { sub: String(user._id) },
    JWT_SECRET,
    { expiresIn: "15m" }
  );

const signRefreshToken = (user) =>
  jwt.sign(
    { sub: String(user._id) },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie("authToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

const sanitizeUser = (userDoc) => {
  const user = typeof userDoc.toObject === "function" ? userDoc.toObject() : { ...userDoc };
  delete user.passwordHash;
  delete user.authToken;
  delete user.refreshToken;
  return user;
};

// POST /users/bootstrap
// NOTE: Guest bootstrap users enter without a password, meaning their passwordHash defaults to an empty string.
router.post("/bootstrap", async (req, res, next) => {
  try {
    const { name, college, identityType, motivationWhy } = req.body;
    const user = await User.create({
      name: name || "Focused Student",
      college: college || "General",
      identityType: identityType || "Serious",
      motivationWhy: motivationWhy || ""
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();
    await logAction({ userId: user._id, action: "USER_BOOTSTRAP", req });

    setAuthCookies(res, accessToken, refreshToken);

    const dashboard = await trackerService.dashboardForUser(user._id);
    res.status(201).json({ user: sanitizeUser(user), token: accessToken, dashboard });
  } catch (err) {
    next(err);
  }
});

// GET /users/:userId/dashboard
router.get("/:userId/dashboard", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const dashboard = await trackerService.dashboardForUser(req.params.userId);
    res.json(dashboard);
  } catch (err) {
    next(err);
  }
});

// PUT /users/:userId/goals/today
router.put("/:userId/goals/today", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const { targetMinutes } = req.body;
    const goal = await trackerService.ensureDailyGoal(req.params.userId);
    goal.targetMinutes = targetMinutes;
    await goal.save();
    await logAction({ userId: req.params.userId, action: "GOAL_TODAY_UPDATE", req, details: { targetMinutes } });
    
    const dashboard = await trackerService.dashboardForUser(req.params.userId);
    res.json({ dashboard });
  } catch (err) {
    next(err);
  }
});

// PUT /users/:userId/goals/config
router.put("/:userId/goals/config", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const { dailyMinutes, weeklyTargetMinutes, weeklySessionTarget } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (dailyMinutes !== undefined) user.goalConfig.dailyMinutes = dailyMinutes;
    if (weeklyTargetMinutes !== undefined) user.goalConfig.weeklyTargetMinutes = weeklyTargetMinutes;
    if (weeklySessionTarget !== undefined) user.goalConfig.weeklySessionTarget = weeklySessionTarget;

    user.markModified('goalConfig');
    await user.save();
    await logAction({ userId: req.params.userId, action: "GOAL_CONFIG_UPDATE", req, details: { dailyMinutes, weeklyTargetMinutes, weeklySessionTarget } });
    const dashboard = await trackerService.dashboardForUser(req.params.userId);
    res.json({ dashboard });
  } catch (err) {
    next(err);
  }
});

// PUT /users/:userId/modes
router.put("/:userId/modes", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const { roastMode, identityType, motivationWhy, ethAddress } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (roastMode !== undefined) user.roastMode = roastMode;
    if (identityType !== undefined) user.identityType = identityType;
    if (motivationWhy !== undefined) user.motivationWhy = motivationWhy;
    if (ethAddress !== undefined) user.ethAddress = ethAddress;

    await user.save();
    const dashboard = await trackerService.dashboardForUser(req.params.userId);
    res.json({ dashboard });
  } catch (err) {
    next(err);
  }
});

// GET /users/:userId/sessions/today
router.get("/:userId/sessions/today", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const today = trackerService.todayKey();
    const sessions = await StudySession.find({ 
      userId: req.params.userId,
      date: today
    }).sort({ startedAt: -1 });
    
    res.json({ sessions, serverTime: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

router.post("/:userId/sessions/offline-sync", requireAuth, requireSelf, sessionLimiter, validate(offlineSyncSchema), async (req, res, next) => {
  try {
    const { sessions } = req.body;
    if (!sessions || sessions.length === 0) {
      return res.status(400).json({ message: "Must provide at least one session" });
    }

    const validatedSessions = sessions.map(s => {
      const start = new Date(s.startedAt).getTime();
      const end = new Date(s.endedAt).getTime();
      let focused = Number(s.focusedMinutes) || 0;
      if (!isNaN(start) && !isNaN(end)) {
        const maxMinutes = Math.floor((end - start) / 60000);
        focused = Math.min(focused, maxMinutes > 0 ? maxMinutes : 0);
      } else {
        focused = 0;
      }
      const dateVal = s.date || (s.startedAt ? new Date(s.startedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
      return {
        ...s,
        date: dateVal,
        focusedMinutes: focused,
        userId: req.params.userId,
        status: "completed"
      };
    });

    const created = await StudySession.insertMany(validatedSessions);

    await trackerService.recalculateDailyTotals(req.params.userId);
    const dashboard = await trackerService.dashboardForUser(req.params.userId);

    res.json({ synced: created.length, dashboard });
  } catch (err) {
    next(err);
  }
});

// POST /users/:userId/email-summary
router.post("/:userId/email-summary", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const summary = await emailService.sendProgressEmail(user, req.body.email || user.email);
    res.json({ ok: true, message: "Email sent", summary });
  } catch (err) {
    next(err);
  }
});

// POST /users/:userId/friends/add
router.post("/:userId/friends/add", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const { friendEmail } = req.body;
    const friend = await User.findOne({ email: friendEmail });
    if (!friend) return res.status(404).json({ message: "Friend not found" });

    const user = await User.findById(req.params.userId).populate("friends", "name xp level streak college");
    if (!user.friends.some(f => f._id.toString() === friend._id.toString())) {
      user.friends.push(friend._id);
      await user.save();
      // Refetch to get populated friends
      await user.populate("friends", "name xp level streak college");
    }

    res.json({ friends: user.friends });
  } catch (err) {
    next(err);
  }
});

// GET /users/:userId/friends/live
router.get("/:userId/friends/live", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).populate("friends", "name xp level streak college");
    const friends = user.friends.map(f => ({
      ...f.toObject(),
      isLive: Math.random() > 0.7, // Mocking live status
      currentSubject: "Neural Science"
    }));
    res.json({ 
      friends, 
      studyingNowCount: friends.filter(f => f.isLive).length, 
      liveMessage: "Neural network synchronization optimal." 
    });
  } catch (err) {
    next(err);
  }
});

// POST /users/:userId/ai-coach
router.post("/:userId/ai-coach", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const { message } = req.body;
    // Simple mock AI response
    const replies = [
      "Keep pushing. Neural link is strong.",
      "Discipline is the only way.",
      "Your current trajectory is optimal.",
      "Focus. The distraction is temporary."
    ];
    res.json({ reply: replies[Math.floor(Math.random() * replies.length)] });
  } catch (err) {
    next(err);
  }
});

// GET /users/:userId/analytics
router.get("/:userId/analytics", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const sessions = await StudySession.find({ userId, status: "completed" }).sort({ startedAt: -1 }).limit(100);
    
    const analyticsUrl = process.env.ANALYTICS_SERVICE_URL || "http://localhost:8000";
    
    // Attempt to call Python backend
    try {
      const http = require("http");
      const url = new URL(`${analyticsUrl}/analyze`);
      
      const postData = JSON.stringify({ sessions });
      
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Authorization': `Bearer ${JWT_SECRET}`
        }
      };

      const proxyReq = http.request(options, (proxyRes) => {
        if (proxyRes.statusCode !== 200) {
          trackerService.dashboardForUser(userId).then(dashboard => {
            res.json({
              average_study_time: dashboard.deepAnalytics.averageSessionLength,
              focus_score: dashboard.focusScore.score,
              message: "Python engine offline. Basic analytics active.",
              graphs: {}
            });
          });
          return;
        }

        let data = '';
        proxyRes.on('data', (chunk) => { data += chunk; });
        proxyRes.on('end', () => {
          try {
            const pythonAnalytics = JSON.parse(data);
            res.json(pythonAnalytics);
          } catch (e) {
            // Fallback if JSON parse fails
            res.json({ message: "Python service returned invalid data", error: true });
          }
        });
      });

      proxyReq.on('error', (e) => {
        // Fallback to Node-only analytics if Python service is down
        trackerService.dashboardForUser(userId).then(dashboard => {
          res.json({
            average_study_time: dashboard.deepAnalytics.averageSessionLength,
            focus_score: dashboard.focusScore.score,
            message: "Python engine offline. Basic analytics active.",
            graphs: {}
          });
        });
      });

      proxyReq.write(postData);
      proxyReq.end();
      
    } catch (err) {
      // General fallback
      const dashboard = await trackerService.dashboardForUser(userId);
      res.json({
        average_study_time: dashboard.deepAnalytics.averageSessionLength,
        focus_score: dashboard.focusScore.score,
        message: "Neural analytics engine in fallback mode.",
        graphs: {}
      });
    }
  } catch (err) {
    next(err);
  }
});

// SESSIONS MANAGEMENT
// POST /users/:userId/sessions/start
router.post("/:userId/sessions/start", requireAuth, requireSelf, sessionLimiter, validate(startSessionSchema), async (req, res, next) => {
  try {
    const { subject, studyMode, plannedDurationMinutes, riskMode } = req.body;
    const userId = req.params.userId;
    const now = new Date().toISOString();
    const dateStr = now.slice(0, 10);
    const session = await StudySession.create({
      userId,
      date: dateStr,
      subject: subject || "General",
      studyMode: studyMode || "custom",
      plannedDurationMinutes: plannedDurationMinutes || 0,
      riskMode: riskMode || false,
      startedAt: now,
      lastStartedAt: now,
      status: "running"
    });
    await logAction({ userId, action: "SESSION_START", req, details: { sessionId: session._id, subject: session.subject, studyMode: session.studyMode } });
    dispatchWebhook(userId, "session.start", { sessionId: session._id, subject: session.subject, studyMode: session.studyMode }).catch(() => {});
    res.status(201).json({ session });
  } catch (err) {
    next(err);
  }
});

// POST /users/:userId/sessions/:sessionId/pause
router.post("/:userId/sessions/:sessionId/pause", requireAuth, requireSelf, sessionLimiter, async (req, res, next) => {
  try {
    const session = await StudySession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    
    const now = new Date();
    if (session.status === "running" && session.lastStartedAt) {
      const delta = Math.floor((now.getTime() - new Date(session.lastStartedAt).getTime()) / 1000);
      session.elapsedSeconds += Math.max(0, delta);
    }
    
    session.status = "paused";
    session.lastStartedAt = null;
    session.pauses.push({ startedAt: now.toISOString(), reason: req.body.reason || "manual" });
    await session.save();
    res.json({ session });
  } catch (err) {
    next(err);
  }
});

// POST /users/:userId/sessions/:sessionId/resume
router.post("/:userId/sessions/:sessionId/resume", requireAuth, requireSelf, sessionLimiter, async (req, res, next) => {
  try {
    const session = await StudySession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const now = new Date();
    session.status = "running";
    session.lastStartedAt = now.toISOString();
    
    if (session.pauses.length > 0) {
      const lastPause = session.pauses[session.pauses.length - 1];
      if (!lastPause.endedAt) lastPause.endedAt = now.toISOString();
    }
    await session.save();
    res.json({ session });
  } catch (err) {
    next(err);
  }
});

// POST /users/:userId/sessions/:sessionId/end
router.post("/:userId/sessions/:sessionId/end", requireAuth, requireSelf, sessionLimiter, validate(endSessionSchema), async (req, res, next) => {
  try {
    const { 
      inactiveSeconds, notes, subject, stopReason, 
      antiCheatFlags, sessionQualityTag, studyMode, 
      plannedDurationMinutes, riskMode 
    } = req.body;
    
    const session = await StudySession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.status === "completed") {
      return res.status(400).json({ message: "Session is already completed" });
    }

    const now = new Date();
    if (session.status === "running" && session.lastStartedAt) {
      const delta = Math.floor((now.getTime() - new Date(session.lastStartedAt).getTime()) / 1000);
      session.elapsedSeconds += Math.max(0, delta);
    }

    // Server timing enforcement
    const maxPossibleElapsed = Math.floor((now.getTime() - new Date(session.startedAt).getTime()) / 1000);
    if (session.elapsedSeconds > maxPossibleElapsed) {
      session.elapsedSeconds = Math.max(0, maxPossibleElapsed);
    }

    session.status = "completed";
    session.lastStartedAt = null;
    session.endedAt = now.toISOString();
    session.focusedMinutes = Math.floor((session.elapsedSeconds || 0) / 60);
    
    const validInactive = Math.min(Math.max(0, inactiveSeconds || 0), session.elapsedSeconds || 0);
    session.inactiveSeconds = validInactive;
    session.notes = notes !== undefined ? notes : session.notes;
    session.subject = subject || session.subject;
    session.stopReason = stopReason || "";
    session.antiCheatFlags = antiCheatFlags || 0;
    session.sessionQualityTag = sessionQualityTag || "";
    if (studyMode) session.studyMode = studyMode;
    if (plannedDurationMinutes !== undefined) session.plannedDurationMinutes = plannedDurationMinutes;
    if (typeof riskMode === "boolean") session.riskMode = riskMode;

    await session.save();
    await logAction({ userId: session.userId, action: "SESSION_END", req, details: { sessionId: session._id, focusedMinutes: session.focusedMinutes } });
    dispatchWebhook(session.userId, "session.end", { sessionId: session._id, focusedMinutes: session.focusedMinutes }).catch(() => {});
    
    await trackerService.recalculateDailyTotals(session.userId);
    const dashboard = await trackerService.dashboardForUser(session.userId);
    
    res.json({ session, dashboard });
  } catch (err) {
    next(err);
  }
});

// POST /users/:userId/sessions/:sessionId/reset
router.post("/:userId/sessions/:sessionId/reset", requireAuth, requireSelf, sessionLimiter, async (req, res, next) => {
  try {
    const session = await StudySession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    session.status = "reset";
    session.stopReason = req.body.stopReason || "reset";
    await session.save();
    await logAction({ userId: req.params.userId, action: "SESSION_RESET", req, details: { sessionId: session._id } });

    const dashboard = await trackerService.dashboardForUser(req.params.userId);
    res.json({ session, dashboard });
  } catch (err) {
    next(err);
  }
});

// DELETE /users/:userId
router.delete("/:userId", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.deletedAt = new Date();
    user.isActive = false;
    user.refreshToken = "";
    await user.save();
    await logAction({ userId: req.params.userId, action: "ACCOUNT_DEACTIVATE", req });

    res.clearCookie("authToken");
    res.clearCookie("refreshToken");
    res.json({ message: "Account deleted successfully (soft delete)" });
  } catch (err) {
    next(err);
  }
});

// GET /users/:userId/export
router.get("/:userId/export", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select("-passwordHash -refreshToken");
    if (!user) return res.status(404).json({ message: "User not found" });

    const sessions = await StudySession.find({ userId: req.params.userId }).sort({ startedAt: -1 });
    const goals = await DailyGoal.find({ userId: req.params.userId }).sort({ date: -1 });
    const auditLogs = await AuditLog.find({ userId: req.params.userId }).sort({ createdAt: -1 });

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: user,
      sessions,
      goals,
      auditLogs
    };

    await logAction({ userId: req.params.userId, action: "USER_DATA_EXPORT", req });

    res.setHeader("Content-Disposition", `attachment; filename=study_tracker_export_${req.params.userId}.json`);
    res.setHeader("Content-Type", "application/json");
    res.json(exportData);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

