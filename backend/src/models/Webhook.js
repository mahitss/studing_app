const mongoose = require("mongoose");

const webhookSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    url: { type: String, required: true },
    events: [{ type: String, enum: ["session.start", "session.end", "streak.milestone"] }],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Webhook", webhookSchema);
