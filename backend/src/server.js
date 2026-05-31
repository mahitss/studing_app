require("dotenv").config();

// Fail fast on startup if critical env variables are missing
if (!process.env.MONGODB_URI) {
  console.error("FATAL CONFIG ERROR: MONGODB_URI is not defined.");
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? null : "612912a49954c0cb79e5aeb40540c5ebb2a35cc93442f83938ed38c3d6b602fd");
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    console.error("FATAL: JWT_SECRET is not defined in environment variables in production mode.");
  } else {
    console.warn("WARNING: JWT_SECRET is not defined in environment variables. Using fallback secret.");
  }
}

const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const connectDB = require("./config/db");
const logger = require("./utils/logger");
const { startScheduler } = require("./jobs/scheduler");

process.on("uncaughtException", (err) => {
  logger.error(`[GrindLock] UNCAUGHT EXCEPTION: ${err.message}`);
  logger.error(err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("[GrindLock] UNHANDLED REJECTION at:", promise, "reason:", reason);
  process.exit(1);
});

// Simple home route for connection testing
app.get("/", (req, res) => res.send("GrindLock API Grid Online."));

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? process.env.APP_URL : ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

server.on("error", (err) => {
  logger.error(`[GrindLock] Server critical error: ${err.message}`);
  if (err.code === "EADDRINUSE") {
    logger.error(`[GrindLock] Port ${PORT} is already occupied. Neural grid collision.`);
  }
});

// Socket.io JWT authentication middleware
const parseCookies = (cookieString) => {
  const cookies = {};
  if (!cookieString) return cookies;
  cookieString.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts[0].trim();
    const value = parts.slice(1).join("=").trim();
    if (name) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  return cookies;
};

const jwt = require("jsonwebtoken");

io.use((socket, next) => {
  try {
    if (!JWT_SECRET) {
      return next(new Error("Server misconfigured: JWT_SECRET is missing"));
    }
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) {
      return next(new Error("Authentication error: No cookies found"));
    }
    const cookies = parseCookies(cookieHeader);
    const token = cookies.authToken;
    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
});

app.set("io", io);

io.on("connection", (socket) => {
  logger.info(`[GrindLock] Neural link established: ${socket.id}`);
  
  socket.on("authenticate", (userId) => {
    try {
      if (!userId || typeof userId !== "string") return;
      if (socket.user && String(socket.user.sub) !== String(userId)) {
        logger.warn(`[GrindLock] Authenticated socket tried to join private channel of user ${userId} but token belongs to ${socket.user.sub}. Blocked.`);
        return socket.emit("error", { message: "Unauthorized private channel join attempt" });
      }
      socket.join(userId);
      logger.info(`[GrindLock] User ${userId} joined private channel.`);
    } catch (err) {
      logger.error(`[GrindLock] Socket Auth Error: ${err.message}`);
    }
  });

  socket.on("join-room", async (data) => {
    try {
      if (!socket.user) {
        return socket.emit("error", { message: "Unauthorized socket" });
      }
      const roomId = typeof data === "string" ? data : data?.roomId;
      if (!roomId || typeof roomId !== "string") {
        return socket.emit("error", { message: "Invalid Room ID" });
      }

      // Basic validation: ensure roomId looks like a valid ID (e.g. hex or uuid)
      if (!/^[a-f\d]{24}$/i.test(roomId) && roomId.length < 10) {
        return socket.emit("error", { message: "Malformed Room ID" });
      }

      socket.join(roomId);
      logger.info(`[GrindLock] Socket ${socket.id} joined synchronized target: ${roomId}`);
    } catch (err) {
      logger.error(`[GrindLock] Socket Join Error: ${err.message}`);
      socket.emit("error", { message: "Failed to join room" });
    }
  });

  socket.on("room-action", (data) => {
    try {
      if (!socket.user) {
        return socket.emit("error", { message: "Unauthorized socket" });
      }
      const { roomId, action, ...rest } = data || {};
      if (!roomId || !action || typeof roomId !== "string" || typeof action !== "string") {
        return;
      }

      // Verify room membership before broadcasting
      if (!socket.rooms.has(roomId)) {
        logger.warn(`[GrindLock] Spoof attempt: Socket ${socket.id} tried to act in room ${roomId} without joining.`);
        return;
      }

      io.to(roomId).emit("room-action", { action, ...rest, userId: data.userId, timestamp: Date.now() });
    } catch (err) {
      logger.error(`[GrindLock] Socket Action Error: ${err.message}`);
    }
  });

  socket.on("disconnect", () => {
    logger.info(`[GrindLock] Neural link severed: ${socket.id}`);
  });
});

const start = async () => {
  await connectDB();
  startScheduler();
  server.listen(PORT, "0.0.0.0", () => {
    logger.info(`[GrindLock] Real-Time Engine active on port ${PORT} (Neural Interface: 0.0.0.0)`);
  });
};

start().catch((err) => {
  logger.error("Failed to start server", err);
  process.exit(1);
});