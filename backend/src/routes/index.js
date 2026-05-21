const express = require("express");
const router = express.Router();

const authRoutes = require("./auth");
const sessionRoutes = require("./sessions");
const roomRoutes = require("./rooms");
const integrationRoutes = require("./integrations");
const userRoutes = require("./users");
const duelRoutes = require("./duels");
const waitlistRoutes = require("./waitlist");
const adminRoutes = require("./admin");
const { getLeaderboard } = require("../services/trackerService");

const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../middleware/auth");

router.get("/health", (_req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({ 
    ok: true, 
    service: "study-tracker-backend", 
    status: "Neural link optimal",
    dependencies: {
      mongodb: mongoStatus
    }
  });
});

router.get("/ready", (_req, res) => {
  const isReady = mongoose.connection.readyState === 1;
  if (!isReady) {
    return res.status(503).json({ ready: false, message: "Database link synchronization failed." });
  }
  res.json({ ready: true, message: "Database connection established." });
});

router.use("/auth", authRoutes);
router.use("/sessions", sessionRoutes);
router.use("/rooms", roomRoutes);
router.use("/integrations", integrationRoutes);
router.use("/users", userRoutes);
router.use("/duels", duelRoutes);
router.use("/waitlist", waitlistRoutes);
router.use("/admin", adminRoutes);

router.get("/leaderboard", async (req, res, next) => {
  try {
    const college = req.query.college || "global";
    const { limit, page } = req.query;

    let userId = null;
    const token = req.cookies?.authToken;
    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        userId = payload.sub;
      } catch (err) {
        // ignore invalid token for public leaderboard
      }
    }

    const result = await getLeaderboard(userId, college, limit, page); 
    if (limit || page) {
      res.json({
        leaderboard: result.leaderboard,
        pagination: result.pagination
      });
    } else {
      res.json({ leaderboard: result.leaderboard });
    }
  } catch (err) {
    next(err);
  }
});

// Legacy/Misc routes can be kept here or moved further

module.exports = router;
