const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? undefined : "dev-local-secret-only");

if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  console.error("CRITICAL CONFIG ERROR: JWT_SECRET must be defined in production. Neural Link will fail.");
}

const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization || "";
  let token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  
  // Fallback to cookie if header is missing
  if (!token && req.cookies) {
    token = req.cookies.authToken;
  }

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!JWT_SECRET) {
    return res.status(500).json({ message: "Server misconfigured: JWT_SECRET missing." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = payload;

    const User = require("../models/User");
    const user = await User.findById(payload.sub).select("isActive deletedAt");
    if (!user || !user.isActive || user.deletedAt) {
      return res.status(401).json({ message: "User account deactivated or deleted" });
    }

    return next();
  } catch (_err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const requireSelf = (req, res, next) => {
  if (String(req.auth?.sub || "") !== String(req.params.userId || "")) {
    return res.status(403).json({ message: "Forbidden: user mismatch" });
  }
  return next();
};

module.exports = { requireAuth, requireSelf, JWT_SECRET };
