const express = require("express");
const StudySession = require("../models/StudySession");
const { requireAuth, requireSelf } = require("../middleware/auth");
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

module.exports = router;
