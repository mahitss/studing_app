const mongoose = require("mongoose");

const challengeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    targetValue: { type: Number, required: true },
    currentValue: { type: Number, default: 0 },
    rewardXp: { type: Number, default: 0 },
    rewardBadge: { type: String },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
    deadline: { type: Date },
    date: { type: String }
  },
  { timestamps: true }
);

challengeSchema.index({ userId: 1, type: 1, isCompleted: 1 });

module.exports = mongoose.model("Challenge", challengeSchema);
