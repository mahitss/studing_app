const express = require("express");
const { requireAuth } = require("../middleware/auth");
const User = require("../models/User");
const router = express.Router();

const rateLimit = require("express-rate-limit");

const wearableSyncLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 1, // limit each user/IP to 1 request per hour
  keyGenerator: (req) => req.auth?.sub || req.ip,
  message: { message: "Wearable device data already synchronized. Limit: once per hour." },
  standardHeaders: true,
  legacyHeaders: false
});

// Mock Calendar Sync
router.post("/calendar/sync", requireAuth, async (req, res) => {
  try {
    // In a real app, this would use OAuth and fetch events
    res.json({ 
      ok: true, 
      message: "Neural Calendar Sync Protocol Initialized",
      syncedEvents: 5,
      nextScheduledSession: "2026-05-10T10:00:00Z"
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mock Wearable Device Tracking
router.post("/wearable/sync", requireAuth, wearableSyncLimiter, async (req, res) => {
  try {
    const bonusXp = Math.floor(Math.random() * 50) + 10;
    const user = await User.findById(req.auth.sub);
    if (user) {
      if (user.xp + bonusXp > Number.MAX_SAFE_INTEGER) {
        user.xp = Number.MAX_SAFE_INTEGER;
      } else {
        user.xp += bonusXp;
      }
      await user.save();
    }
    res.json({ 
      ok: true, 
      bonusXp,
      message: "Biometric focus detected. Bonus XP awarded."
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
