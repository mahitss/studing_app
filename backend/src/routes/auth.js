const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const { JWT_SECRET, requireAuth } = require("../middleware/auth");
const crypto = require("crypto");
const emailService = require("../services/emailService");
const validate = require("../middleware/validate");
const { registerSchema, loginSchema } = require("../validations/auth.validation");
const { logAction } = require("../utils/auditLogger");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per IP
  message: { message: "Too many authentication attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per IP
  message: { message: "Too many password reset attempts. Please try again in an hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

const sanitizeUser = (userDoc) => {
  const user = typeof userDoc.toObject === "function" ? userDoc.toObject() : { ...userDoc };
  delete user.passwordHash;
  delete user.authToken;
  delete user.refreshToken;
  return user;
};

const signAccessToken = (user) =>
  jwt.sign(
    { sub: String(user._id) },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

const signRefreshToken = (user) =>
  jwt.sign(
    { sub: String(user._id) },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie("authToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

router.post("/register", authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: "Email already in use" });

    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash: password, // Will be hashed by pre-save hook
      name: name || "Focused Student"
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();
    await logAction({ userId: user._id, action: "AUTH_REGISTER", req });

    setAuthCookies(res, accessToken, refreshToken);
    res.status(201).json({ user: sanitizeUser(user), token: accessToken });
  } catch (err) {
    next(err);
  }
});

router.post("/login", authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase(), isActive: true });
    if (!user) {
      await logAction({ action: "AUTH_LOGIN_FAILED", req, status: "failed", details: { email } });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = (user.passwordHash && typeof user.passwordHash === "string")
      ? await bcrypt.compare(password, user.passwordHash)
      : false;
    if (!isMatch) {
      await logAction({ userId: user._id, action: "AUTH_LOGIN_FAILED", req, status: "failed", details: { email } });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.twoFactorEnabled) {
      const mfaToken = jwt.sign(
        { sub: String(user._id), type: "mfa" },
        JWT_SECRET,
        { expiresIn: "5m" }
      );
      return res.json({ requires2FA: true, mfaToken });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();
    await logAction({ userId: user._id, action: "AUTH_LOGIN", req });

    setAuthCookies(res, accessToken, refreshToken);
    res.json({ user: sanitizeUser(user), token: accessToken });
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: "Refresh token required" });

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const user = await User.findOne({ _id: payload.sub, refreshToken: token, isActive: true });
    if (!user) {
      // Token reuse / compromise detection: clear refresh token for security
      if (payload.sub) {
        await User.updateOne({ _id: payload.sub }, { refreshToken: "" });
      }
      return res.status(401).json({ message: "Compromise detected or user inactive. Please login again." });
    }

    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    setAuthCookies(res, newAccessToken, newRefreshToken);
    res.json({ token: newAccessToken });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      const payload = jwt.decode(token);
      if (payload && payload.sub) {
        await User.updateOne({ _id: payload.sub }, { refreshToken: "" });
        await logAction({ userId: payload.sub, action: "AUTH_LOGOUT", req });
      }
    }
    res.clearCookie("authToken");
    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
});

// POST /auth/2fa/login - Verify 2FA code during login
router.post("/2fa/login", authLimiter, async (req, res, next) => {
  try {
    const { mfaToken, code } = req.body;
    if (!mfaToken || !code) {
      return res.status(400).json({ message: "MFA token and code required" });
    }

    let payload;
    try {
      payload = jwt.verify(mfaToken, JWT_SECRET);
      if (payload.type !== "mfa") throw new Error();
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired MFA session" });
    }

    const user = await User.findById(payload.sub);
    if (!user || !user.isActive || user.deletedAt) {
      return res.status(401).json({ message: "User disabled or not found" });
    }

    const { verifyTOTP } = require("../utils/totp");
    const isVerified = verifyTOTP(code, user.twoFactorSecret);
    if (!isVerified) {
      await logAction({ userId: user._id, action: "AUTH_2FA_FAILED", req, status: "failed" });
      return res.status(401).json({ message: "Invalid code" });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();
    await logAction({ userId: user._id, action: "AUTH_LOGIN_2FA", req });

    setAuthCookies(res, accessToken, refreshToken);
    res.json({ user: sanitizeUser(user), token: accessToken });
  } catch (err) {
    next(err);
  }
});

// POST /auth/2fa/setup - Initialize 2FA configuration
router.post("/2fa/setup", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.sub);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { generateSecret } = require("../utils/totp");
    const secret = generateSecret();
    const otpauthUrl = `otpauth://totp/StudyTracker:${user.email || user.name}?secret=${secret}&issuer=StudyTracker`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

    user.twoFactorSecret = secret;
    await user.save();

    res.json({ secret, otpauthUrl, qrCodeUrl });
  } catch (err) {
    next(err);
  }
});

// POST /auth/2fa/verify - Verify and complete 2FA setup
router.post("/2fa/verify", requireAuth, async (req, res, next) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.auth.sub);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { verifyTOTP } = require("../utils/totp");
    const isVerified = verifyTOTP(code, user.twoFactorSecret);
    if (!isVerified) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    user.twoFactorEnabled = true;
    await user.save();
    await logAction({ userId: user._id, action: "AUTH_2FA_ENABLE", req });

    res.json({ message: "Two-factor authentication enabled successfully", user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /auth/2fa/disable - Disable 2FA
router.post("/2fa/disable", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.sub);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.twoFactorEnabled = false;
    user.twoFactorSecret = "";
    await user.save();
    await logAction({ userId: user._id, action: "AUTH_2FA_DISABLE", req });

    res.json({ message: "Two-factor authentication disabled successfully", user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /auth/verify-email - Verify email address
router.post("/verify-email", async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Verification token is required" });

    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) return res.status(400).json({ message: "Invalid or expired verification token" });

    user.isEmailVerified = true;
    user.emailVerificationToken = "";
    await user.save();
    await logAction({ userId: user._id, action: "AUTH_EMAIL_VERIFIED", req });

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    next(err);
  }
});

// POST /auth/resend-verification - Resend verification email
router.post("/resend-verification", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.sub);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isEmailVerified) return res.status(400).json({ message: "Email is already verified" });

    const token = crypto.randomBytes(20).toString("hex");
    user.emailVerificationToken = token;
    await user.save();

    await emailService.sendVerificationEmail(user, token);
    res.json({ message: "Verification email sent successfully" });
  } catch (err) {
    next(err);
  }
});

// POST /auth/forgot-password - Request password reset
router.post("/forgot-password", passwordResetLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) {
      return res.json({ message: "If that email exists, a reset link has been sent." });
    }

    const token = crypto.randomBytes(20).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 3600000;
    await user.save();

    await emailService.sendResetPasswordEmail(user, token);
    await logAction({ userId: user._id, action: "AUTH_PASSWORD_RESET_REQUEST", req });

    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    next(err);
  }
});

// POST /auth/reset-password - Perform password reset
router.post("/reset-password", passwordResetLimiter, async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    user.passwordHash = password;
    user.passwordResetToken = "";
    user.passwordResetExpires = null;
    await user.save();

    await logAction({ userId: user._id, action: "AUTH_PASSWORD_RESET_SUCCESS", req });
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
