// Minimal diagnostic route that bypasses all requirements
module.exports = async (req, res) => {
  // Handle preflight requests instantly to avoid CORS blocks on initialization errors
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie");
    return res.status(200).end();
  }

  const url = req.url || "";
  if (url.includes("neural-diagnostic")) {
    return res.status(200).json({ 
      status: "Neural Diagnostic Active",
      node: process.version,
      env: process.env.NODE_ENV,
      hasMongo: !!process.env.MONGODB_URI,
      hasJwt: !!process.env.JWT_SECRET
    });
  }

  try {
    console.log("[Diagnostic] Attempting to load app...");
    const app = require("../src/app");
    console.log("[Diagnostic] App loaded. Attempting DB connection...");
    
    if (!process.env.MONGODB_URI) {
       throw new Error("Missing MONGODB_URI");
    }

    const connectDB = require("../src/config/db");
    await connectDB();
    console.log("[Diagnostic] DB connected. Routing request...");

    return app(req, res);
  } catch (err) {
    console.error("[Neural Crash]", err);
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie");
    res.status(500).json({
      error: "Neural link initialization failed",
      message: err.message,
      code: err.code,
      stack: err.stack,
      hint: "Check Vercel logs for [Neural Crash] prefix."
    });
  }
};
