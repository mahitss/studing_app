const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    college: { type: String, default: "General" },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    passwordHash: { type: String, default: "" },
    authToken: { type: String, default: "" },
    xp: { type: Number, default: 0, min: 0 },
    level: { type: Number, default: 1, min: 1 },
    badges: [{ type: String }],
    achievements: [{
      achievementId: { type: mongoose.Schema.Types.ObjectId, ref: "Achievement" },
      earnedAt: { type: Date, default: Date.now }
    }],
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    studyGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: "StudyGroup" }],
    preferredStudyTime: { type: String, default: "20:00" },
    goalConfig: {
      dailyMinutes: { type: Number, default: 180 },
      weeklyTargetMinutes: { type: Number, default: 1200 },
      weeklySessionTarget: { type: Number, default: 7 }
    },
    roastMode: { type: Boolean, default: true },
    identityType: { type: String, enum: ["Casual", "Serious", "Hardcore"], default: "Serious" },
    motivationWhy: { type: String, default: "" },
    ethAddress: { type: String, default: "" },
    streak: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastActivityDate: { type: String } // YYYY-MM-DD
    },
    pet: {
      name: { type: String, default: "Neural-Bot" },
      type: { type: String, default: "robot" },
      level: { type: Number, default: 1 },
      happiness: { type: Number, default: 100, min: 0, max: 100 }
    },
    refreshToken: { type: String, default: "" },
    deletedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    twoFactorSecret: { type: String, default: "" },
    twoFactorEnabled: { type: Boolean, default: false },
    passwordResetToken: { type: String, default: "" },
    passwordResetExpires: { type: Date, default: null },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, default: "" }
  },
  { timestamps: true }
);

const bcrypt = require("bcryptjs");

userSchema.pre("save", async function(next) {
  if (!this.isModified("passwordHash")) return next();
  if (this.passwordHash && this.passwordHash.length > 0 && !this.passwordHash.startsWith("$2")) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
