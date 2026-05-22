const mongoose = require("mongoose");

let cachedConnection = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("❌ MONGODB_URI is missing in environment variables.");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    cachedConnection = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    await cachedConnection;
    console.log(`✅ MongoDB connected successfully`);
    return mongoose.connection;
  } catch (err) {
    console.error(`❌ MongoDB connection failed: ${err.message}`);
    cachedConnection = null;
    throw err;
  }
};

module.exports = connectDB;
