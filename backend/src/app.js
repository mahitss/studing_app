const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const routes = require("./routes");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");

const app = express();
app.set("trust proxy", 1);

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is missing in production environment variables.");
}

const corsOptions = {
  origin: (origin, callback) => {
    const isVercel = origin && origin.endsWith(".vercel.app");
    const allowed = [process.env.APP_URL, "https://grindlock.vercel.app"].filter(Boolean);
    if (!origin || allowed.includes(origin) || isVercel || process.env.NODE_ENV !== "production") {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"]
};

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Managed separately for Next.js compatibility
  crossOriginEmbedderPolicy: false
}));

const { timezoneStore } = require("./utils/timezoneStore");

app.use(cors(corsOptions));
app.use(cookieParser());
app.use((req, res, next) => {
  const offsetHeader = req.headers["x-timezone-offset"];
  const offset = offsetHeader !== undefined ? parseInt(offsetHeader, 10) || 0 : 0;
  timezoneStore.run(offset, next);
});
app.use(require("./middleware/requestLogger"));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Strip MongoDB operator injections from req.body, req.query, req.params
app.use(mongoSanitize({ replaceWith: "_" }));
app.use(require("./middleware/sanitize"));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, 
  message: { message: "Too many authentication attempts. Neural link locked for 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { message: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter, routes);

const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

module.exports = app;