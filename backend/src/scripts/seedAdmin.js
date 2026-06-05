require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

async function seedAdmin() {
  try {
    console.log("⚡ Initializing GrindLock Admin Seeder...");
    await connectDB();

    const email = (process.env.ADMIN_EMAIL || "admin@grindlock.app").toLowerCase().trim();
    const password = process.env.ADMIN_PASSWORD || "GrindLockAdmin2026!";
    const name = "System Administrator";

    console.log(`🔍 Checking if administrator already exists for email: ${email}...`);
    let user = await User.findOne({ email });

    if (user) {
      console.log(`ℹ️ Admin already exists in registry. Updating role and status...`);
      user.role = "admin";
      user.isActive = true;
      user.isEmailVerified = true;
      await user.save();
      console.log("✅ Administrator updated successfully.");
    } else {
      console.log("🌱 Admin not found. Creating new administrative node...");
      user = await User.create({
        email,
        passwordHash: password, // Will be auto-hashed by Mongoose pre-save hook
        name,
        role: "admin",
        isActive: true,
        isEmailVerified: true
      });
      console.log("✅ New Administrator spawned successfully.");
    }

    console.log("=================================================");
    console.log(`  Admin Email:     ${email}`);
    console.log(`  Admin Password:  ${password}`);
    console.log("=================================================");
  } catch (err) {
    console.error("❌ Seeding admin failed:", err);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed.");
    process.exit(0);
  }
}

seedAdmin();
