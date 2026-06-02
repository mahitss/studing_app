const logger = require("../utils/logger");

const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info({
      message: `${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip
    });
  });
  next();
};

module.exports = requestLogger;
