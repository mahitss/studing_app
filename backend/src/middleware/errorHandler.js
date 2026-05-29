const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  let { statusCode, code, message, details } = err;

  // Set defaults if not an ApiError instance
  if (!statusCode) {
    statusCode = 500;
    code = "INTERNAL_SERVER_ERROR";
    message = "An unexpected error occurred on the neural node.";
    if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
      message = "Server misconfiguration: JWT_SECRET is missing in environment variables.";
    }
    details = process.env.NODE_ENV === "production" ? null : { stack: err.stack, reason: err.message };
  }

  if (statusCode >= 500) {
    logger.error(`[API Error] ${code}: ${err.message}`, { stack: err.stack });
  } else {
    logger.info(`[Client Error] ${code}: ${err.message}`);
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      details
    }
  });
};

module.exports = errorHandler;
