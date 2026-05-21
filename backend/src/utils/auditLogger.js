const AuditLog = require("../models/AuditLog");
const logger = require("./logger");

const logAction = async ({ userId, action, req, status = "success", details = {} }) => {
  try {
    let ipAddress = "";
    let userAgent = "";
    if (req) {
      ipAddress = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
      userAgent = req.headers["user-agent"] || "";
    }

    await AuditLog.create({
      userId: userId || null,
      action,
      ipAddress,
      userAgent,
      status,
      details
    });
  } catch (err) {
    // Fail silently in terms of API response, but log the failure internally
    logger.error(`Audit logging failed for action ${action}: ${err.message}`, { error: err });
  }
};

module.exports = { logAction };
