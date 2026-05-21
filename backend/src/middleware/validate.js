const ApiError = require("../utils/ApiError");

const validate = (schema) => (req, res, next) => {
  try {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const details = result.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      throw new ApiError(400, "INVALID_INPUT", "Input validation failed", details);
    }

    // Replace req properties with parsed values (removes extra unvalidated keys)
    req.body = result.data.body || req.body;
    req.query = result.data.query || req.query;
    req.params = result.data.params || req.params;
    
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = validate;
