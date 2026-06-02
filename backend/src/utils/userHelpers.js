const jwt = require("jsonwebtoken");

// Access the JWT_SECRET from auth middleware or process.env directly
const JWT_SECRET = process.env.JWT_SECRET || "612912a49954c0cb79e5aeb40540c5ebb2a35cc93442f83938ed38c3d6b602fd";

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

const sanitizeUser = (userDoc) => {
  const user = typeof userDoc.toObject === "function" ? userDoc.toObject() : { ...userDoc };
  delete user.passwordHash;
  delete user.authToken;
  delete user.refreshToken;
  return user;
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  sanitizeUser
};
