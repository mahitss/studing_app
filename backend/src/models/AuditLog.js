const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    action: { type: String, required: true, index: true }, // e.g. "AUTH_LOGIN", "GOAL_UPDATE", "SESSION_RESET", "ACCOUNT_DEACTIVATE"
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    status: { type: String, enum: ["success", "failed"], required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
