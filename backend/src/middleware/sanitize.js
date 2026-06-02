const sanitizeHtml = (str) => {
  if (typeof str !== "string") return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

const sanitizeInput = (val, key) => {
  // Exclude security-sensitive, URL, and address fields from escaping
  const excludedKeys = ["password", "token", "refreshToken", "email", "friendEmail", "ethAddress"];
  if (excludedKeys.includes(key)) return val;
  
  if (typeof val === "string") {
    return sanitizeHtml(val);
  }
  if (Array.isArray(val)) {
    return val.map((item) => sanitizeInput(item, key));
  }
  if (val && typeof val === "object") {
    const cleaned = {};
    for (const k in val) {
      cleaned[k] = sanitizeInput(val[k], k);
    }
    return cleaned;
  }
  return val;
};

const sanitizeMiddleware = (req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      req.body[key] = sanitizeInput(req.body[key], key);
    }
  }
  next();
};

module.exports = sanitizeMiddleware;
