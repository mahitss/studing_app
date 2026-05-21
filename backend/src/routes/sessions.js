const express = require("express");
const mongoose = require("mongoose");
const StudySession = require("../models/StudySession");
const { requireAuth, requireSelf } = require("../middleware/auth");
const { recalculateDailyTotals, ensureDailyGoal, dashboardForUser } = require("../services/trackerService");
const { updateStreak, updateChallengeProgress } = require("../services/gamificationService");
const router = express.Router();

router.get("/:userId", requireAuth, requireSelf, async (req, res, next) => {
  try {
    const { limit = 50, page = 1, subject, startDate, endDate, sortBy = "startedAt", sortOrder = "desc" } = req.query;
    
    const parsedLimit = Math.min(Math.max(1, parseInt(limit) || 50), 100);
    const parsedPage = Math.max(1, parseInt(page) || 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const query = { userId: req.params.userId };

    if (subject) {
      query.subject = { $regex: String(subject), $options: "i" };
    }

    if (startDate || endDate) {
      query.startedAt = {};
      if (startDate) query.startedAt.$gte = new Date(startDate).toISOString();
      if (endDate) query.startedAt.$lte = new Date(endDate).toISOString();
    }

    const sortDir = sortOrder === "asc" ? 1 : -1;
    const sortOptions = {};
    sortOptions[sortBy] = sortDir;

    const total = await StudySession.countDocuments(query);
    const sessions = await StudySession.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parsedLimit);

    res.json({
      sessions,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post("/start", requireAuth, async (req, res, next) => {
  try {
    const { userId, subject, studyMode, plannedDurationMinutes, riskMode } = req.body;
    if (String(req.auth.sub) !== String(userId)) return res.status(403).json({ message: "Identity mismatch" });

    const now = new Date().toISOString();
    const session = await StudySession.create({
      userId,
      subject,
      studyMode,
      plannedDurationMinutes,
      riskMode,
      startedAt: now,
      lastStartedAt: now,
      status: "running"
    });

    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

router.post("/:sessionId/pause", requireAuth, async (req, res, next) => {
  try {
    const session = await StudySession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (String(session.userId) !== String(req.auth.sub)) return res.status(403).json({ message: "Forbidden" });

    const now = new Date();
    if (session.status === "running" && session.lastStartedAt) {
      const delta = Math.floor((now.getTime() - new Date(session.lastStartedAt).getTime()) / 1000);
      session.elapsedSeconds += Math.max(0, delta);
    }
    
    session.status = "paused";
    session.lastStartedAt = null;
    session.pauses.push({ startedAt: now.toISOString() });
    await session.save();
    res.json(session);
  } catch (err) {
    next(err);
  }
});

router.post("/:sessionId/resume", requireAuth, async (req, res, next) => {
  try {
    const session = await StudySession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (String(session.userId) !== String(req.auth.sub)) return res.status(403).json({ message: "Forbidden" });

    const now = new Date();
    session.status = "running";
    session.lastStartedAt = now.toISOString();
    
    if (session.pauses.length > 0) {
      const lastPause = session.pauses[session.pauses.length - 1];
      if (!lastPause.endedAt) {
        lastPause.endedAt = now.toISOString();
      }
    }
    await session.save();
    res.json(session);
  } catch (err) {
    next(err);
  }
});

router.post("/:sessionId/end", requireAuth, async (req, res, next) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();
  
  try {
    const { 
      focusedMinutes, 
      inactiveSeconds, 
      notes, 
      subject, 
      stopReason, 
      antiCheatFlags, 
      sessionQualityTag,
      studyMode,
      plannedDurationMinutes,
      riskMode
    } = req.body;
    
    const session = await StudySession.findById(req.params.sessionId).session(dbSession);
    if (!session) {
      await dbSession.abortTransaction();
      return res.status(404).json({ message: "Session not found" });
    }
    if (String(session.userId) !== String(req.auth.sub)) {
      await dbSession.abortTransaction();
      return res.status(403).json({ message: "Forbidden" });
    }

    const now = new Date();
    if (session.status === "running" && session.lastStartedAt) {
      const delta = Math.floor((now.getTime() - new Date(session.lastStartedAt).getTime()) / 1000);
      session.elapsedSeconds += Math.max(0, delta);
    }

    session.status = "completed";
    session.lastStartedAt = null;
    session.endedAt = now.toISOString();
    session.focusedMinutes = focusedMinutes || 0;
    session.inactiveSeconds = inactiveSeconds || 0;
    session.notes = notes || session.notes;
    session.subject = subject || session.subject;
    session.stopReason = stopReason || "";
    session.antiCheatFlags = antiCheatFlags || 0;
    session.sessionQualityTag = sessionQualityTag || "";
    if (studyMode) session.studyMode = studyMode;
    if (plannedDurationMinutes) session.plannedDurationMinutes = plannedDurationMinutes;
    if (typeof riskMode === "boolean") session.riskMode = riskMode;

    await session.save({ session: dbSession });

    // Multi-step updates that must be atomic
    await ensureDailyGoal(session.userId, undefined, dbSession);
    await recalculateDailyTotals(session.userId, undefined, dbSession);
    
    // Gamification updates
    await updateStreak(session.userId);
    await updateChallengeProgress(session.userId, "daily", session.focusedMinutes);
    if (session.studyMode === "deep" && session.focusedMinutes >= 50) {
      await updateChallengeProgress(session.userId, "daily", 1); // For "Complete 1 deep focus" challenge
    }

    await dbSession.commitTransaction();
    
    // Fetch fresh dashboard data outside transaction or as final step
    const dashboard = await dashboardForUser(session.userId);
    res.json({ session, dashboard });
  } catch (err) {
    await dbSession.abortTransaction();
    next(err);
  } finally {
    dbSession.endSession();
  }
});

module.exports = router;
