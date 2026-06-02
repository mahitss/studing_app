const express = require("express");
const StudyRoom = require("../models/StudyRoom");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();

/**
 * Middleware to verify the authenticated user is a member of the target room.
 * Attaches the room to req.room to avoid a second DB fetch in the route handler.
 */
const requireMembership = async (req, res, next) => {
  try {
    const room = await StudyRoom.findById(req.params.roomId).lean();
    if (!room) return res.status(404).json({ message: "Room not found" });

    const isMember = (room.members || []).some(
      (m) => m.toString() === req.auth.sub
    );
    if (!isMember) {
      return res.status(403).json({ message: "Forbidden: you are not a member of this room" });
    }

    req.room = room;
    next();
  } catch (err) {
    next(err);
  }
};

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { limit, page, name } = req.query;
    const query = {};

    if (name) {
      query.name = { $regex: String(name), $options: "i" };
    }

    if (limit || page) {
      const parsedLimit = Math.min(Math.max(1, parseInt(limit) || 20), 100);
      const parsedPage = Math.max(1, parseInt(page) || 1);
      const skip = (parsedPage - 1) * parsedLimit;

      const total = await StudyRoom.countDocuments(query);
      const rooms = await StudyRoom.find(query)
        .populate("ownerId", "name level college")
        .skip(skip)
        .limit(parsedLimit);

      return res.json({
        rooms,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          pages: Math.ceil(total / parsedLimit)
        }
      });
    }

    const rooms = await StudyRoom.find(query).populate("ownerId", "name level college").limit(50);
    res.json(rooms);
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { name, ambientSettings } = req.body;
    const room = await StudyRoom.create({
      name,
      ownerId: req.auth.sub,
      members: [req.auth.sub],
      ambientSettings: ambientSettings || "default"
    });
    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
});

router.post("/:roomId/join", requireAuth, async (req, res, next) => {
  try {
    const room = await StudyRoom.findOneAndUpdate(
      { _id: req.params.roomId },
      { $addToSet: { members: req.auth.sub } },
      { new: true }
    );
    if (!room) return res.status(404).json({ message: "Room not found" });
    res.json(room);
  } catch (err) {
    next(err);
  }
});

router.post("/:roomId/notes", requireAuth, requireMembership, async (req, res, next) => {
  try {
    const { notes } = req.body;
    const room = await StudyRoom.findByIdAndUpdate(
      req.params.roomId,
      { sharedNotes: notes || "" },
      { new: true }
    );
    if (!room) return res.status(404).json({ message: "Room not found" });

    const io = req.app.get("io");
    if (io) {
      io.to(req.params.roomId).emit("notes-updated", { userId: req.auth.sub, notes });
    }
    res.json({ ok: true, notes: room.sharedNotes });
  } catch (err) {
    next(err);
  }
});

router.post("/:roomId/vote-ambient", requireAuth, requireMembership, async (req, res, next) => {
  try {
    const { trackId } = req.body;
    const room = await StudyRoom.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    room.ambientSettings = {
      ...room.ambientSettings,
      track: trackId
    };
    await room.save();

    const io = req.app.get("io");
    if (io) {
      io.to(req.params.roomId).emit("ambient-changed", { track: trackId });
    }
    res.json({ ok: true, track: trackId });
  } catch (err) {
    next(err);
  }
});

router.post("/:roomId/alert", requireAuth, requireMembership, async (req, res, next) => {
  try {
    const { type, message } = req.body;
    const user = await User.findById(req.auth.sub);
    const userName = user ? user.name : "Agent";

    const io = req.app.get("io");
    if (io) {
      io.to(req.params.roomId).emit("emergency-alert", { userName, message, type });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/:roomId/ai-qa", requireAuth, requireMembership, async (req, res, next) => {
  try {
    const { message } = req.body;
    const replies = [
      "Optimal focus trajectory is achieved by completing the current task block.",
      "Discipline is muscle memory. Do not break connection.",
      "The AI Coach recommends a 5-minute break only after the 50-minute mark.",
      "Distractions detected. Recalibrate focus uplink."
    ];
    const reply = replies[Math.floor(Math.random() * replies.length)];

    const io = req.app.get("io");
    if (io) {
      io.to(req.params.roomId).emit("ai-coach-broadcast", { message: `AI Coach suggestion: ${reply}` });
    }
    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

router.post("/:roomId/bet", requireAuth, requireMembership, async (req, res, next) => {
  try {
    const { amount, outcome } = req.body;
    const user = await User.findById(req.auth.sub);
    const userName = user ? user.name : "Agent";

    const io = req.app.get("io");
    if (io) {
      io.to(req.params.roomId).emit("bet-placed", { userName, amount, outcome });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
