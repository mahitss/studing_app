const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roleAuth");
const { logAction } = require("../utils/auditLogger");
const validate = require("../middleware/validate");
const { updateRoleSchema, updateStatusSchema } = require("../validations/admin.validation");

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { message: "Too many admin requests. Neural dashboard throttled." },
  standardHeaders: true,
  legacyHeaders: false
});

// Require admin rate limiting, authentication, and admin role for all admin routes
router.use(adminLimiter, requireAuth, requireRole("admin"));

// GET /admin/users - List users
router.get("/users", async (req, res, next) => {
  try {
    const { limit = 20, page = 1, search, role, isActive } = req.query;
    const parsedLimit = Math.min(Math.max(1, parseInt(limit) || 20), 100);
    const parsedPage = Math.max(1, parseInt(page) || 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: String(search), $options: "i" } },
        { email: { $regex: String(search), $options: "i" } },
        { college: { $regex: String(search), $options: "i" } }
      ];
    }

    if (role) {
      query.role = role;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select("-passwordHash -refreshToken")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit);

    res.json({
      users,
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

// PUT /admin/users/:userId/role - Change user role
router.put("/users/:userId/role", validate(updateRoleSchema), async (req, res, next) => {
  try {
    const { role } = req.body;

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const oldRole = user.role;
    user.role = role;
    await user.save();

    await logAction({
      userId: req.auth.sub,
      action: "ADMIN_CHANGE_ROLE",
      req,
      details: { targetUserId: user._id, oldRole, newRole: role }
    });

    res.json({ message: `User role updated to ${role}`, user: { _id: user._id, role: user.role } });
  } catch (err) {
    next(err);
  }
});

// PUT /admin/users/:userId/status - Change active status (ban / unban)
router.put("/users/:userId/status", validate(updateStatusSchema), async (req, res, next) => {
  try {
    const { isActive } = req.body;

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isActive = isActive;
    if (!isActive) {
      user.refreshToken = ""; // Invalidate refresh token on ban
    } else {
      user.deletedAt = null; // Restore if it was soft deleted
    }
    await user.save();

    await logAction({
      userId: req.auth.sub,
      action: isActive ? "ADMIN_ACTIVATE_USER" : "ADMIN_DEACTIVATE_USER",
      req,
      details: { targetUserId: user._id }
    });

    res.json({ message: `User active status set to ${isActive}`, user: { _id: user._id, isActive: user.isActive } });
  } catch (err) {
    next(err);
  }
});

// GET /admin/audit-logs - View audit logs
router.get("/audit-logs", async (req, res, next) => {
  try {
    const { limit = 50, page = 1, action, status, userId } = req.query;
    const parsedLimit = Math.min(Math.max(1, parseInt(limit) || 50), 200);
    const parsedPage = Math.max(1, parseInt(page) || 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const query = {};

    if (action) {
      query.action = action;
    }

    if (status) {
      query.status = status;
    }

    if (userId) {
      query.userId = userId;
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate("userId", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit);

    res.json({
      logs,
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
