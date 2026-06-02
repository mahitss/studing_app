const jwt = require("jsonwebtoken");

const { JWT_SECRET } = require("../middleware/auth");

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
