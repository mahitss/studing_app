const User = require("../models/User");

const requireRole = (...roles) => {
  return async (req, res, next) => {
    try {
      if (!req.auth || !req.auth.sub) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await User.findById(req.auth.sub);
      if (!user || !user.isActive || user.deletedAt) {
        return res.status(403).json({ message: "Account disabled or not found" });
      }

      if (!roles.includes(user.role)) {
        return res.status(403).json({ message: "Access denied. Insufficient privileges." });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { requireRole };
