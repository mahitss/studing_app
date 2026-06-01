const mongoose = require("mongoose");
const User = require("../models/User");
const Challenge = require("../models/Challenge");
const StudySession = require("../models/StudySession");
const Achievement = require("../models/Achievement");
const logger = require("../utils/logger");

// Seasonal Event Configuration
const CURRENT_EVENT = {
  active: true,
  multiplier: 1.5,
  name: "Spring Neural Surge",
  endDate: new Date("2026-12-31")
};

async function awardAchievement(userId, criteriaType, value) {
  try {
    const achievements = await Achievement.find({
      criteriaType,
      criteriaValue: { $lte: value }
    });
    const user = await User.findById(userId);
    if (!user || !achievements.length) return;

    let newlyEarned = [];
    for (const ach of achievements) {
      const alreadyHas = user.achievements.some(a => a.achievementId.toString() === ach._id.toString());
      if (!alreadyHas) {
        user.achievements.push({ achievementId: ach._id });
        user.xp += ach.rewardXp;
        newlyEarned.push(ach.title);
      }
    }

    if (newlyEarned.length) {
      await user.save();
      logger.info(`User ${userId} earned achievements: ${newlyEarned.join(", ")}`);
    }
  } catch (err) {
    logger.error(`Error awarding achievements: ${err.message}`);
  }
}

async function ensureDailyChallenges(userId) {
  const today = new Date().toISOString().slice(0, 10);

  const dailyTasks = [
    {
      title: "Deep Focus Master",
      description: "Focus for 2 hours today",
      targetValue: 120,
      type: "minutes",
      rewardXp: 200,
      date: today
    },
    {
      title: "Subject Diver",
      description: "Study 3 different subjects",
      targetValue: 3,
      type: "subjects",
      rewardXp: 150,
      date: today
    }
  ];

  for (const task of dailyTasks) {
    await Challenge.findOneAndUpdate(
      { userId, date: today, type: task.type },
      { $setOnInsert: { ...task, isCompleted: false, currentValue: 0 } },
      { upsert: true, new: true }
    );
  }
  logger.info(`Verified daily challenges for user ${userId}`);
}

async function updateChallengeProgress(userId, type, value) {
  try {
    const challenges = await Challenge.find({ userId, isCompleted: false });
    if (!challenges || challenges.length === 0) return;

    for (const challenge of challenges) {
      if (challenge.type === type) {
        challenge.currentValue += value;
        if (challenge.currentValue >= challenge.targetValue) {
          challenge.isCompleted = true;

          let rewardXp = challenge.rewardXp;
          if (CURRENT_EVENT.active && new Date() < CURRENT_EVENT.endDate) {
            rewardXp = Math.round(rewardXp * CURRENT_EVENT.multiplier);
          }

          const updateOps = { $inc: { xp: rewardXp } };
          if (challenge.rewardBadge) {
            updateOps.$addToSet = { badges: challenge.rewardBadge };
          }
          await User.updateOne({ _id: userId }, updateOps);
          logger.info(`User ${userId} completed challenge: ${challenge.title}. Rewarded ${rewardXp} XP (Multiplier active: ${rewardXp > challenge.rewardXp}).`);
        }
        await challenge.save();
      }
    }

    const stats = await StudySession.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), status: "completed" } },
      { $group: { _id: null, total: { $sum: "$focusedMinutes" } } }
    ]);
    if (stats.length) {
      await awardAchievement(userId, "total_minutes", stats[0].total);
    }

  } catch (err) {
    logger.error(`Error updating challenge progress: ${err.message}`);
  }
}

async function updateStreak(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const user = await User.findById(userId);
  if (!user) return;

  if (!user.streak) {
    user.streak = { current: 0, longest: 0, lastActivityDate: "" };
  }
  if (!user.pet) {
    user.pet = { name: "Neural-Bot", type: "robot", level: 1, happiness: 100 };
  }

  if (user.streak.lastActivityDate === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (user.streak.lastActivityDate === yesterdayStr) {
    user.streak.current += 1;
  } else {
    user.streak.current = 1;
    user.pet.happiness = Math.max(10, user.pet.happiness - 40);
  }

  if (user.streak.current > user.streak.longest) {
    user.streak.longest = user.streak.current;
  }

  user.streak.lastActivityDate = today;
  user.pet.happiness = Math.min(100, user.pet.happiness + 10);

  await user.save();

  await awardAchievement(userId, "streak", user.streak.current);
  await awardAchievement(userId, "pet_level", user.pet.level);

  logger.info(`Updated streak for user ${userId}: ${user.streak.current} days.`);

}

module.exports = {
  ensureDailyChallenges,
  updateChallengeProgress,
  updateStreak,
  awardAchievement
};
