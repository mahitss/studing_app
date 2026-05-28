const mongoose = require("mongoose");

let cachedConnection = null;
let mongoServer = null;

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
    console.log("⚡ Connecting to MongoDB Atlas...");
    cachedConnection = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    await cachedConnection;
    console.log(`✅ MongoDB connected successfully`);
    return mongoose.connection;
  } catch (err) {
    console.warn(`⚠️ MongoDB connection failed: ${err.message}`);
    console.log("🚀 Attempting to spin up in-memory MongoDB fallback...");
    try {
      const { MongoMemoryServer } = require("mongodb-memory-server");
      mongoServer = await MongoMemoryServer.create({
        instance: {
          startupTimeoutMS: 120000
        }
      });
      const mongoUri = mongoServer.getUri();
      console.log(`ℹ️ In-memory MongoDB URI: ${mongoUri}`);
      
      cachedConnection = mongoose.connect(mongoUri);
      await cachedConnection;
      console.log(`✅ Connected to local in-memory MongoDB successfully!`);

      // Auto-seed achievements
      try {
        const Achievement = require("../models/Achievement");
        const count = await Achievement.countDocuments();
        if (count === 0) {
          const achievements = [
            {
              title: "Neural Initiate",
              description: "Start your first study session",
              criteriaType: "total_minutes",
              criteriaValue: 1,
              icon: "Zap",
              rewardXp: 50,
              category: "general"
            },
            {
              title: "Focused Operative",
              description: "Complete a 7-day study streak",
              criteriaType: "streak",
              criteriaValue: 7,
              icon: "Flame",
              rewardXp: 300,
              category: "milestone"
            },
            {
              title: "Deep Diver",
              description: "Study for 500 total minutes",
              criteriaType: "total_minutes",
              criteriaValue: 500,
              icon: "Target",
              rewardXp: 500,
              category: "milestone"
            },
            {
              title: "Pet Whisperer",
              description: "Reach pet level 5",
              criteriaType: "pet_level",
              criteriaValue: 5,
              icon: "Shield",
              rewardXp: 250,
              category: "pet"
            }
          ];
          await Achievement.insertMany(achievements);
          console.log("✅ Seeded achievements automatically to in-memory database");
        }
      } catch (seedErr) {
        console.warn(`⚠️ Failed to auto-seed achievements: ${seedErr.message}`);
      }

      return mongoose.connection;
    } catch (fallbackErr) {
      console.error(`❌ Failed to start in-memory MongoDB fallback: ${fallbackErr.message}`);
      cachedConnection = null;
      throw fallbackErr;
    }
  }
};

module.exports = connectDB;

