const express = require("express");
const router = express.Router();
const Duel = require("../models/Duel");
const { requireAuth } = require("../middleware/auth");

// POST /duels
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { challengerId, opponentId, durationMinutes } = req.body;
    const duel = await Duel.create({
      challengerId,
      opponentId,
      durationMinutes,
      status: "pending"
    });
    res.status(201).json(duel);
  } catch (err) {
    next(err);
  }
});

// GET /duels/:userId
router.get("/:userId", requireAuth, async (req, res, next) => {
  try {
    const { limit, page, status } = req.query;
    const query = {
      $or: [{ challengerId: req.params.userId }, { opponentId: req.params.userId }]
    };

    if (status) {
      query.status = status;
    }

    if (limit || page) {
      const parsedLimit = Math.min(Math.max(1, parseInt(limit) || 20), 100);
      const parsedPage = Math.max(1, parseInt(page) || 1);
      const skip = (parsedPage - 1) * parsedLimit;

      const total = await Duel.countDocuments(query);
      const duels = await Duel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit);

      return res.json({
        duels,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          pages: Math.ceil(total / parsedLimit)
        }
      });
    }

    const duels = await Duel.find(query).sort({ createdAt: -1 });
    res.json(duels);
  } catch (err) {
    next(err);
  }
});

// POST /duels/:duelId/sync
router.post("/:duelId/sync", requireAuth, async (req, res, next) => {
  try {
    const { userId, progress } = req.body;
    const duel = await Duel.findById(req.params.duelId);
    if (!duel) return res.status(404).json({ message: "Duel not found" });

    if (String(duel.challengerId) === String(userId)) {
      duel.challengerProgress = progress;
    } else if (String(duel.opponentId) === String(userId)) {
      duel.opponentProgress = progress;
    } else {
      return res.status(403).json({ message: "Not a participant" });
    }

    if (duel.challengerProgress >= duel.durationMinutes || duel.opponentProgress >= duel.durationMinutes) {
      duel.status = "completed";
      if (duel.challengerProgress >= duel.durationMinutes && duel.opponentProgress >= duel.durationMinutes) {
        // If both finished, the one who just synced is considered winner in this simplified logic
        // or we could check who has more progress.
        duel.winnerId = String(userId) === String(duel.challengerId) ? duel.challengerId : duel.opponentId;
      } else {
        duel.winnerId = duel.challengerProgress >= duel.durationMinutes ? duel.challengerId : duel.opponentId;
      }
    }

    await duel.save();
    res.json(duel);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
