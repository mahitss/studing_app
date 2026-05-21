const User = require("../models/User");
const logger = require("../utils/logger");
const gamificationService = require("../services/gamificationService");

const runDailyChecks = async () => {
  try {
    logger.info("[Scheduler] Starting daily database synchronization and streak checks...");

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const users = await User.find({ isActive: true, deletedAt: null });

    for (const user of users) {
      try {
        await gamificationService.ensureDailyChallenges(user._id);
      } catch (err) {
        logger.error(`[Scheduler] Seeding challenges failed for user ${user._id}: ${err.message}`);
      }

      if (user.streak.current > 0 && user.streak.lastActivityDate !== today && user.streak.lastActivityDate !== yesterdayStr) {
        logger.info(`[Scheduler] Decaying streak for user ${user._id}. Last active was ${user.streak.lastActivityDate}`);
        user.streak.current = 0;
        user.pet.happiness = Math.max(10, user.pet.happiness - 40);
        await user.save();
      }
    }

    logger.info("[Scheduler] Daily checks completed successfully.");
  } catch (err) {
    logger.error(`[Scheduler] Daily checks failed: ${err.message}`);
  }
};

const startScheduler = () => {
  let lastCheckedDay = new Date().getUTCDate();

  logger.info("[Scheduler] Initializing background task runner...");

  setInterval(async () => {
    const now = new Date();
    const currentDay = now.getUTCDate();
    if (currentDay !== lastCheckedDay) {
      lastCheckedDay = currentDay;
      await runDailyChecks();
    }
  }, 60 * 60 * 1000); // every hour
  
  setTimeout(runDailyChecks, 5000);
};

module.exports = { startScheduler };
