const DailyGoal = require("../models/DailyGoal");
const StudySession = require("../models/StudySession");
const User = require("../models/User");
const Challenge = require("../models/Challenge");
const gamificationService = require("./gamificationService");
const { todayKey, yesterdayKey, getAdjustedDate } = require("../utils/dateUtils");

const levelFromXp = (xp) => Math.min(50, Math.floor((xp || 0) / 600) + 1);

const ensureDailyGoal = async (userId, date = todayKey(), dbSession = null) => {
  let goal = await DailyGoal.findOne({ userId, date }).session(dbSession);
  if (!goal) {
    const user = await User.findById(userId).session(dbSession);
    const dailyMinutes = user?.goalConfig?.dailyMinutes || 180;
    try {
      const created = await DailyGoal.create([{ userId, date, targetMinutes: dailyMinutes }], { session: dbSession });
      if (!created || !created[0]) throw new Error("Daily goal creation failed.");
      goal = created[0];
    } catch (err) {
      if (err.code === 11000 || err.message?.includes("E11000")) {
        // Concurrency fallback: another request created it in the meantime, fetch it
        goal = await DailyGoal.findOne({ userId, date }).session(dbSession);
        if (!goal) throw new Error("Daily goal fetching failed after concurrent write.");
      } else {
        throw err;
      }
    }
  }
  return goal;
};

const recalculateDailyTotals = async (userId, date = todayKey(), dbSession = null) => {
  const goal = await ensureDailyGoal(userId, date, dbSession);

  const sessions = await StudySession.find({ userId, date, status: "completed" }).session(dbSession);
  const studiedMinutes = sessions.reduce((sum, s) => sum + (s.focusedMinutes || 0), 0);

  goal.studiedMinutes = studiedMinutes;
  goal.completionPercent = goal.targetMinutes
    ? Math.min(100, Math.round((studiedMinutes / goal.targetMinutes) * 100))
    : 0;
  goal.completed = goal.targetMinutes > 0 && studiedMinutes >= goal.targetMinutes;
  await goal.save({ session: dbSession });

  return { goal, sessions };
};

const streakFromGoals = (goals) => {
  if (!goals.length) {
    return { current: 0, longest: 0, missed: 0 };
  }

  const byDate = new Map(goals.map((g) => [g.date, g]));
  const dates = goals.map((g) => g.date).sort();

  let longest = 0;
  let running = 0;
  for (const date of dates) {
    const item = byDate.get(date);
    if (item.completed) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }

  let current = 0;
  const cursor = getAdjustedDate();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    const day = byDate.get(key);
    if (day && day.completed) {
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    break;
  }

  const today = todayKey();
  const missed = goals.filter((g) => g.date < today && !g.completed).length;

  return { current, longest, missed };
};

// yesterdayKey is imported from dateUtils

const weeklyMetrics = (goals, weeklyTargetMinutes = 1200) => {
  const now = getAdjustedDate();
  const from = new Date(now);
  from.setDate(from.getDate() - 6);
  const fromKey = from.toISOString().slice(0, 10);

  const weeklyGoals = goals.filter((g) => g.date >= fromKey && g.date <= todayKey());
  const targetMinutes = weeklyGoals.reduce((sum, g) => sum + (g.targetMinutes || 0), 0);
  const studiedMinutes = weeklyGoals.reduce((sum, g) => sum + (g.studiedMinutes || 0), 0);
  const wastedMinutes = weeklyGoals.reduce(
    (sum, g) => sum + Math.max(0, (g.targetMinutes || 0) - (g.studiedMinutes || 0)),
    0
  );
  const completedDays = weeklyGoals.filter((g) => g.completed).length;

  return {
    weeklyTargetHours: +(targetMinutes / 60).toFixed(1),
    weeklyStudyHours: +(studiedMinutes / 60).toFixed(1),
    weeklyWastedHours: +(wastedMinutes / 60).toFixed(1),
    weeklyCompletionPercent: targetMinutes ? Math.round((studiedMinutes / targetMinutes) * 100) : 0,
    completedDays,
    weeklyGoalTypeTargetHours: +(weeklyTargetMinutes / 60).toFixed(1),
    weeklyGoalTypeCompletionPercent: weeklyTargetMinutes
      ? Math.round((studiedMinutes / weeklyTargetMinutes) * 100)
      : 0
  };
};

const twoWeekSlices = (goals) => {
  const now = getAdjustedDate();
  const startCurrent = new Date(now);
  startCurrent.setDate(startCurrent.getDate() - 6);
  const endPrevious = new Date(startCurrent);
  endPrevious.setDate(endPrevious.getDate() - 1);
  const startPrevious = new Date(endPrevious);
  startPrevious.setDate(startPrevious.getDate() - 6);

  const currentFrom = startCurrent.toISOString().slice(0, 10);
  const previousFrom = startPrevious.toISOString().slice(0, 10);
  const previousTo = endPrevious.toISOString().slice(0, 10);

  const current = goals.filter((g) => g.date >= currentFrom && g.date <= todayKey());
  const previous = goals.filter((g) => g.date >= previousFrom && g.date <= previousTo);
  return { current, previous };
};

const scoreLabel = (score) => {
  if (score >= 85) return "elite";
  if (score >= 70) return "strong";
  if (score >= 50) return "average";
  return "weak";
};

const focusScoreForToday = (todaySessions) => {
  if (!todaySessions.length) {
    return { score: 0, label: "weak", message: "Your focus score today: 0% (weak)" };
  }

  const uninterruptedBonus = todaySessions.reduce((sum, s) => {
    const pausePenalty = (s.pauseCount || 0) * 8;
    const inactivePenalty = Math.round((s.inactiveSeconds || 0) / 60);
    const longSessionBonus = (s.focusedMinutes || 0) >= 45 ? 12 : 4;
    return sum + Math.max(0, longSessionBonus + (s.focusedMinutes || 0) - pausePenalty - inactivePenalty);
  }, 0);

  const maxPossible = todaySessions.reduce((sum, s) => sum + Math.max(20, (s.focusedMinutes || 0) + 12), 0);
  const score = maxPossible ? Math.max(0, Math.min(100, Math.round((uninterruptedBonus / maxPossible) * 100))) : 0;
  const label = scoreLabel(score);

  return { score, label, message: `Your focus score today: ${score}% (${label})` };
};

const dailyHistory = (goals, days = 60) => {
  const byDate = new Map(goals.map((g) => [g.date, g]));
  const output = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = getAdjustedDate();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const day = byDate.get(key);
    const completionPercent = day?.completionPercent || 0;
    output.push({
      date: key,
      studiedMinutes: day?.studiedMinutes || 0,
      targetMinutes: day?.targetMinutes || 0,
      completionPercent,
      completed: Boolean(day?.completed),
      intensity: Math.min(4, Math.floor(completionPercent / 25)),
      color: completionPercent >= 100 ? "green" : completionPercent >= 50 ? "yellow" : completionPercent > 0 ? "orange" : "red"
    });
  }

  return output;
};

const focusPulse = (sessions) => {
  if (!sessions.length) {
    return { score: 0, level: "Cold Start", avgFocusMinutes: 0, avgInactiveMinutes: 0 };
  }

  const avgFocusMinutes = Math.round(
    sessions.reduce((sum, s) => sum + (s.focusedMinutes || 0), 0) / sessions.length
  );
  const avgInactiveMinutes = Math.round(
    sessions.reduce((sum, s) => sum + ((s.inactiveSeconds || 0) / 60), 0) / sessions.length
  );
  const avgPause = Math.round(sessions.reduce((sum, s) => sum + (s.pauseCount || 0), 0) / sessions.length);

  const score = Math.max(0, Math.min(100, avgFocusMinutes + 24 - avgInactiveMinutes - (avgPause * 6)));
  let level = "Unstable";
  if (score >= 80) level = "Locked In";
  else if (score >= 60) level = "Solid";
  else if (score >= 40) level = "Warming Up";

  return { score, level, avgFocusMinutes, avgInactiveMinutes };
};

const subjectBreakdown = (sessions) => {
  const map = new Map();
  sessions.forEach((s) => {
    const key = s.subject || "General";
    map.set(key, (map.get(key) || 0) + (s.focusedMinutes || 0));
  });

  const sorted = [...map.entries()]
    .map(([subject, minutes]) => ({ subject, minutes, hours: +(minutes / 60).toFixed(1) }))
    .sort((a, b) => b.minutes - a.minutes);

  const weak = sorted.filter((s) => s.minutes < 90).map((s) => `${s.subject} needs attention.`);
  return { subjects: sorted, weakAlerts: weak.slice(0, 3) };
};

const deepAnalytics = (sessions) => {
  if (!sessions.length) {
    return {
      bestStudyTime: "No data",
      averageSessionLength: 0,
      trendDirection: "flat",
      weekendConsistency: "No weekend data"
    };
  }

  const byHour = new Array(24).fill(0);
  sessions.forEach((s) => {
    byHour[new Date(s.startedAt).getHours()] += s.focusedMinutes || 0;
  });
  const bestHour = byHour.indexOf(Math.max(...byHour));

  const averageSessionLength = Math.round(
    sessions.reduce((sum, s) => sum + (s.focusedMinutes || 0), 0) / sessions.length
  );

  const latest = sessions.slice(0, Math.min(10, sessions.length));
  const older = sessions.slice(Math.min(10, sessions.length), Math.min(20, sessions.length));
  const latestAvg = latest.length ? latest.reduce((sum, s) => sum + (s.focusedMinutes || 0), 0) / latest.length : 0;
  const olderAvg = older.length ? older.reduce((sum, s) => sum + (s.focusedMinutes || 0), 0) / older.length : latestAvg;
  const trendDirection = latestAvg > olderAvg + 5 ? "up" : latestAvg < olderAvg - 5 ? "down" : "flat";

  const weekend = sessions.filter((s) => {
    const day = new Date(s.startedAt).getDay();
    return day === 0 || day === 6;
  });
  const weekday = sessions.filter((s) => {
    const day = new Date(s.startedAt).getDay();
    return day >= 1 && day <= 5;
  });
  const weekendAvg = weekend.length ? weekend.reduce((sum, s) => sum + (s.focusedMinutes || 0), 0) / weekend.length : 0;
  const weekdayAvg = weekday.length ? weekday.reduce((sum, s) => sum + (s.focusedMinutes || 0), 0) / weekday.length : 0;

  const weekendConsistency = weekendAvg >= weekdayAvg * 0.7
    ? "You stay fairly consistent on weekends."
    : "You are inconsistent on weekends.";

  return {
    bestStudyTime: `${String(bestHour).padStart(2, "0")}:00`,
    averageSessionLength,
    trendDirection,
    weekendConsistency
  };
};

const roastLines = [
  "Netflix studied more than you today.",
  "You had one job.",
  "Discipline left the chat.",
  "Future you is not impressed."
];

const challengeProgress = (goals, sessions, streak) => {
  const now = getAdjustedDate();
  const from = new Date(now);
  from.setDate(from.getDate() - 6);
  const fromKey = from.toISOString().slice(0, 10);

  const weeklyGoals = goals.filter((g) => g.date >= fromKey && g.date <= todayKey());
  const weeklyMinutes = weeklyGoals.reduce((sum, g) => sum + (g.studiedMinutes || 0), 0);
  const noMissed = weeklyGoals.length === 7 && weeklyGoals.every((g) => g.completed);
  
  const yKey = yesterdayKey();
  const yGoal = goals.find((g) => g.date === yKey);
  const yMinutes = yGoal ? yGoal.studiedMinutes || 0 : 0;
  const todayGoalObj = goals.find((g) => g.date === todayKey());
  const tMinutes = todayGoalObj ? todayGoalObj.studiedMinutes || 0 : 0;

  return [
    {
      id: "study-20h",
      title: "Study 20 hours this week",
      target: 1200,
      value: weeklyMinutes,
      completed: weeklyMinutes >= 1200,
      rewardXp: 250,
      rewardBadge: "20h Warrior"
    },
    {
      id: "no-miss",
      title: "No missed days challenge",
      target: 7,
      value: noMissed ? 7 : Math.max(0, 7 - streak.missed),
      completed: noMissed,
      rewardXp: 200,
      rewardBadge: "Unbreakable Week"
    },
    {
      id: "beat-yesterday",
      title: "Beat Yesterday's Time",
      target: yMinutes + 1,
      value: tMinutes,
      completed: yMinutes > 0 && tMinutes > yMinutes,
      rewardXp: 50,
      rewardBadge: "Relentless Improver"
    }
  ];
};

const coachSuggestions = (sessions, deep, weakAlerts, streak, energy) => {
  const suggestions = [];

  // Burnout detection
  const recentTotalMinutes = sessions.slice(0, 7).reduce((sum, s) => sum + (s.focusedMinutes || 0), 0);
  if (recentTotalMinutes > 2400) { // > 40 hours in recent sessions
    suggestions.push("High risk of neural fatigue detected. Schedule a mandatory 24h detox.");
  }

  suggestions.push(deep.weekendConsistency);
  if (energy?.strongestWindow && energy.strongestWindow !== "00:00") {
    suggestions.push(`Optimal performance window: ${energy.strongestWindow}. Align deep work here.`);
  } else {
    suggestions.push(`Try studying at ${deep.bestStudyTime} (your historically best time).`);
  }

  const avgInactive = sessions.length
    ? Math.round(sessions.reduce((sum, s) => sum + ((s.inactiveSeconds || 0) / 60), 0) / sessions.length)
    : 0;
  if (avgInactive > 8) {
    suggestions.push("Your distraction load is high. Protocol: 'Digital Silence' for next session.");
  }

  if (weakAlerts.length) {
    suggestions.push(`Vulnerability detected in ${weakAlerts[0]}. Deploy more focus blocks.`);
  }

  if (streak.current > 5) {
    suggestions.push(`Momentum status: Elite. You're outperforming 95% of users.`);
  }

  return suggestions.slice(0, 4);
};

const identityMessaging = (identityType, completedToday) => {
  if (identityType === "Hardcore") {
    return {
      strictness: 1,
      line: completedToday ? "You executed. Repeat tomorrow." : "No excuses. Finish your goal."
    };
  }
  if (identityType === "Casual") {
    return {
      strictness: 3,
      line: completedToday ? "Nice consistency today." : "Take one focused step right now."
    };
  }
  return {
    strictness: 2,
    line: completedToday ? "Solid work. Keep momentum." : "Stay disciplined. Hit your target."
  };
};

const endOfDayReport = (todayGoal, streak) => {
  const hour = getAdjustedDate().getHours();
  if (hour < 21) {
    return { available: false, message: "" };
  }

  const success = Boolean(todayGoal?.completed);
  return {
    available: true,
    success,
    totalHours: +((todayGoal?.studiedMinutes || 0) / 60).toFixed(1),
    streak: streak.current,
    message: success ? "Solid work. Repeat tomorrow." : "You slipped. Fix it tomorrow."
  };
};

const quitReasonsSummary = (sessions) => {
  const map = new Map();
  sessions.forEach((s) => {
    if (!s.stopReason) return;
    map.set(s.stopReason, (map.get(s.stopReason) || 0) + 1);
  });
  return [...map.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
};

const computeMomentum = (goals) => {
  if (!goals.length) return { score: 0, state: "cold", message: "Momentum is cold. Start moving." };
  let score = 0;
  let run = 0;
  goals.forEach((g) => {
    if (g.completed) {
      run += 1;
      score += 1;
      if (run >= 3) score += 1;
    } else {
      run = 0;
      score -= 0.4;
    }
  });
  score = Math.max(0, Math.min(100, Math.round(score * 5)));
  const state = score >= 70 ? "on-fire" : score >= 40 ? "stable" : "cold";
  return {
    score,
    state,
    message: state === "on-fire" ? "You are on a roll." : state === "stable" ? "Momentum is building." : "Momentum is low. Win today."
  };
};

const microGoalsFromTarget = (targetMinutes, studiedMinutes) => {
  const step = Math.max(20, Math.round(targetMinutes / 3));
  const milestones = [step, step * 2, targetMinutes];
  return milestones.map((m, idx) => ({
    label: `${idx + 1}h checkpoint`,
    targetMinutes: m,
    done: studiedMinutes >= m
  }));
};

const qualityBreakdown = (sessions) => {
  const total = sessions.length || 1;
  const deep = sessions.filter((s) => s.sessionQualityTag === "deep").length;
  const average = sessions.filter((s) => s.sessionQualityTag === "average").length;
  const distracted = sessions.filter((s) => s.sessionQualityTag === "distracted").length;
  return {
    deepPercent: Math.round((deep / total) * 100),
    averagePercent: Math.round((average / total) * 100),
    distractedPercent: Math.round((distracted / total) * 100)
  };
};

const weeklyRealityReport = (goals) => {
  const now = getAdjustedDate();
  const from = new Date(now);
  from.setDate(from.getDate() - 6);
  const fromKey = from.toISOString().slice(0, 10);
  const weekly = goals.filter((g) => g.date >= fromKey && g.date <= todayKey());
  if (!weekly.length) {
    return { available: now.getDay() === 0, message: "No weekly data yet." };
  }
  const totalHours = +(weekly.reduce((s, g) => s + (g.studiedMinutes || 0), 0) / 60).toFixed(1);
  const missedDays = weekly.filter((g) => !g.completed).length;
  const best = [...weekly].sort((a, b) => (b.studiedMinutes || 0) - (a.studiedMinutes || 0))[0];
  const worst = [...weekly].sort((a, b) => (a.studiedMinutes || 0) - (b.studiedMinutes || 0))[0];
  return {
    available: now.getDay() === 0,
    totalHours,
    missedDays,
    bestDay: best?.date || "",
    worstDay: worst?.date || "",
    message: `You wasted ${missedDays} days this week.`
  };
};

const missedDayRecovery = (goals, todayGoal) => {
  const yKey = yesterdayKey();
  const yGoal = goals.find((g) => g.date === yKey);
  const yesterdayMissed = Boolean(yGoal) && !yGoal.completed;
  const requiredMinutes = Math.max(60, (todayGoal?.targetMinutes || 0) * 2);
  const completed = (todayGoal?.studiedMinutes || 0) >= requiredMinutes;
  return {
    eligible: yesterdayMissed,
    requiredMinutes,
    completed,
    message: yesterdayMissed
      ? completed
        ? "Recovery complete. Your streak is protected."
        : `Recovery chance active: complete ${requiredMinutes} minutes today to save streak.`
      : "No recovery needed today."
  };
};

const effortVsResult = (goals) => {
  const studiedMinutes = goals.reduce((sum, g) => sum + (g.studiedMinutes || 0), 0);
  const completedDays = goals.filter((g) => g.completed).length;
  const completionRate = goals.length ? Math.round((completedDays / goals.length) * 100) : 0;
  const studiedHours = +(studiedMinutes / 60).toFixed(1);
  return {
    studiedHours,
    completionRate,
    message: `You studied ${studiedHours} hrs and completed ${completionRate}% of goals.`
  };
};

const weakDayDetection = (goals) => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const missCount = new Array(7).fill(0);
  goals.forEach((g) => {
    if (g.completed) return;
    const idx = new Date(g.date).getDay();
    missCount[idx] += 1;
  });
  const worstIdx = missCount.indexOf(Math.max(...missCount));
  const worstCount = missCount[worstIdx] || 0;
  const weakDay = worstCount > 0 ? days[worstIdx] : "No weak day yet";
  return {
    weakDay,
    misses: worstCount,
    reminder: worstCount > 0 ? `You fail mostly on ${weakDay}. Protect that day.` : "No weak-day pattern yet."
  };
};

const lazyPattern = (sessions) => {
  const now = getAdjustedDate();
  const from = new Date(now);
  from.setDate(from.getDate() - 6);
  const fromKey = from.toISOString().slice(0, 10);
  const weekly = sessions.filter((s) => (s.date || "").slice(0, 10) >= fromKey);
  const earlyQuitCount = weekly.filter(
    (s) => s.stopReason || ((s.plannedDurationMinutes || 0) > 0 && (s.focusedMinutes || 0) < Math.round((s.plannedDurationMinutes || 0) * 0.5))
  ).length;
  return {
    earlyQuitCount,
    message: `You quit ${earlyQuitCount} sessions early this week.`
  };
};

const weeklySelfRank = (goals) => {
  const { current, previous } = twoWeekSlices(goals);
  const currentMinutes = current.reduce((sum, g) => sum + (g.studiedMinutes || 0), 0);
  const previousMinutes = previous.reduce((sum, g) => sum + (g.studiedMinutes || 0), 0);
  const delta = currentMinutes - previousMinutes;
  const rank = delta > 120 ? "A" : delta > 0 ? "B" : delta === 0 ? "C" : "D";
  return {
    rank,
    deltaMinutes: delta,
    message: delta >= 0
      ? `You are outperforming last week by ${Math.round(delta / 60)}h.`
      : `You are behind last week by ${Math.round(Math.abs(delta) / 60)}h.`
  };
};

const monthlyProgress = (goals) => {
  const now = getAdjustedDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const prevMonth = prevMonthDate.getMonth();
  const prevYear = prevMonthDate.getFullYear();

  const thisMonthGoals = goals.filter((g) => {
    const d = new Date(g.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const prevMonthGoals = goals.filter((g) => {
    const d = new Date(g.date);
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  });

  const monthlyHours = +(thisMonthGoals.reduce((s, g) => s + (g.studiedMinutes || 0), 0) / 60).toFixed(1);
  const prevHours = +(prevMonthGoals.reduce((s, g) => s + (g.studiedMinutes || 0), 0) / 60).toFixed(1);
  const growthPercent = prevHours > 0 ? Math.round(((monthlyHours - prevHours) / prevHours) * 100) : 0;

  return {
    monthlyHours,
    growthPercent,
    trend: growthPercent > 5 ? "up" : growthPercent < -5 ? "down" : "flat"
  };
};

const sessionReplay = (todaySessions) =>
  todaySessions
    .slice()
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    .map((s) => ({
      sessionId: String(s._id),
      start: new Date(s.startedAt).toISOString(),
      end: s.endedAt ? new Date(s.endedAt).toISOString() : null,
      minutes: s.focusedMinutes || 0,
      subject: s.subject || "General",
      studyMode: s.studyMode || "custom",
      riskMode: Boolean(s.riskMode),
      status: s.status
    }));

const pressureNotifications = (remainingMinutes, streak, weakDay, recovery) => {
  const list = [];
  if (remainingMinutes > 0) {
    list.push(`You're behind by ${(remainingMinutes / 60).toFixed(1)} hrs today.`);
  }
  if (streak.current >= 2 && remainingMinutes > 0) {
    list.push("Your streak is at risk.");
  }
  if (weakDay?.weakDay && weakDay.weakDay !== "No weak day yet") {
    list.push(`High-risk day pattern: ${weakDay.weakDay}.`);
  }
  if (recovery?.eligible && !recovery.completed) {
    list.push("Recovery chance is active today. Don't waste it.");
  }
  return list.slice(0, 3);
};

const futureProjection = (weeklyHours, consistencyScore) => {
  if (consistencyScore < 45) {
    return "If you repeat this week for 6 months -> you'll fall behind.";
  }
  if (consistencyScore >= 75 && weeklyHours >= 18) {
    return "Keep this up -> you're ahead of 90% students.";
  }
  return "You're improving. Increase one more focused block daily.";
};

const habitBuilderPlan = (streak, deep) => {
  const ready = streak.current >= 5;
  return {
    ready,
    suggestedTime: deep.bestStudyTime || "20:00",
    message: ready ? `Auto routine: study daily at ${deep.bestStudyTime}.` : "Build a 5-day streak to unlock auto routine."
  };
};

const comebackModeData = (goals, dailyMinutes) => {
  const recent = goals.slice(-3);
  const missed = recent.filter((g) => !g.completed).length;
  const active = missed >= 2;
  return {
    active,
    reducedGoalMinutes: active ? Math.max(60, Math.round(dailyMinutes * 0.6)) : dailyMinutes,
    message: active ? "Start small. Build back." : ""
  };
};

const softLockData = (todayGoal, preferredTime) => {
  const now = getAdjustedDate();
  const current = now.getHours() * 60 + now.getMinutes();
  const [h, m] = (preferredTime || "20:00").split(":").map(Number);
  const pref = (h * 60) + (m || 0);
  const active = current >= pref && !todayGoal?.completed && (todayGoal?.studiedMinutes || 0) < 30;
  return {
    active,
    message: active ? "You planned to study. Continue?" : ""
  };
};

const energyPattern = (sessions) => {
  if (!sessions.length) {
    return { strongestWindow: "No data", quitWindow: "No data", message: "No energy pattern yet." };
  }
  const byHour = new Array(24).fill(0);
  const quitByHour = new Array(24).fill(0);
  sessions.forEach((s) => {
    const hr = new Date(s.startedAt).getHours();
    byHour[hr] += s.focusedMinutes || 0;
    if ((s.stopReason || "").toLowerCase() && (s.focusedMinutes || 0) < 30) quitByHour[hr] += 1;
  });
  const strong = byHour.indexOf(Math.max(...byHour));
  const quit = quitByHour.indexOf(Math.max(...quitByHour));
  return {
    strongestWindow: `${String(strong).padStart(2, "0")}:00`,
    quitWindow: `${String(quit).padStart(2, "0")}:00`,
    message: `You're strong around ${String(strong).padStart(2, "0")}:00 and tend to quit around ${String(quit).padStart(2, "0")}:00.`
  };
};

const applyXpAndBadges = async (userId, preloaded = null) => {
  let user, goals, sessions;
  if (preloaded) {
    user = preloaded.user;
    goals = preloaded.goals;
    sessions = preloaded.sessions;
  } else {
    user = await User.findById(userId);
    if (!user) return null;
    const [preloadedGoals, preloadedSessions] = await Promise.all([
      DailyGoal.find({ userId }).sort({ date: 1 }),
      StudySession.find({ userId, status: "completed" }).sort({ startedAt: -1 }).limit(500)
    ]);
    goals = preloadedGoals;
    sessions = preloadedSessions;
  }

  if (!user) return null;

  if (!user.streak) {
    user.streak = { current: 0, longest: 0, lastActivityDate: "" };
  }
  if (!user.pet) {
    user.pet = { name: "Neural-Bot", type: "robot", level: 1, happiness: 100 };
  }

  const streak = streakFromGoals(goals);

  const totalFocusedMinutes = sessions.reduce((sum, s) => sum + (s.focusedMinutes || 0), 0);
  const totalHours = Math.floor(totalFocusedMinutes / 60);
  const riskBonus = sessions.reduce((sum, s) => {
    const planned = s.plannedDurationMinutes || 0;
    if (s.riskMode && planned > 0 && (s.focusedMinutes || 0) >= planned) {
      return sum + (s.focusedMinutes || 0);
    }
    return sum;
  }, 0);
  const baseXp = totalFocusedMinutes + riskBonus;
  const streakXp = streak.current * 20;
  let xp = baseXp + streakXp;

  const earnedBadges = new Set(user.badges || []);
  if (streak.current >= 7) earnedBadges.add("Disciplined Beast");
  if (totalHours >= 10) earnedBadges.add("10h Grinder");
  if (totalHours >= 50) earnedBadges.add("Focus Titan");

  const challenges = challengeProgress(goals, sessions, streak);
  challenges.forEach((c) => {
    if (c.completed) {
      xp += c.rewardXp;
      earnedBadges.add(c.rewardBadge);
    }
  });

  user.xp = xp;
  user.level = levelFromXp(xp);
  user.badges = [...earnedBadges];
  await user.save();

  return user;
};

const dashboardForUser = async (userId) => {
  // 1. Setup daily challenges and daily goals totals in parallel
  const [_, { goal: todayGoal, sessions: todaySessions }] = await Promise.all([
    gamificationService.ensureDailyChallenges(userId),
    recalculateDailyTotals(userId)
  ]);

  // 2. Preload User, Daily Goals list, Completed Study Sessions list, and Active Challenges list in parallel
  const [user, goals, sessions, dbChallenges] = await Promise.all([
    User.findById(userId),
    DailyGoal.find({ userId }).sort({ date: 1 }),
    StudySession.find({ userId, status: "completed" }).sort({ startedAt: -1 }).limit(500),
    Challenge.find({ userId, isCompleted: false })
  ]);

  if (!user) {
    throw new Error("User not found");
  }

  // 3. Apply XP and badges using the preloaded data
  await applyXpAndBadges(userId, { user, goals, sessions });

  // 4. Calculate metrics based on the preloaded lists
  const streak = streakFromGoals(goals);
  const weekly = weeklyMetrics(goals, user.goalConfig?.weeklyTargetMinutes || 1200);

  // We slice display sessions to 120 for the UI to prevent bloating
  const displaySessions = sessions.slice(0, 120);

  const totalMinutes = goals.reduce((sum, g) => sum + (g.studiedMinutes || 0), 0);
  const identity = identityMessaging(user.identityType || "Serious", Boolean(todayGoal?.completed));
  const punishmentActive = !todayGoal?.completed && streak.missed >= identity.strictness;
  const history = dailyHistory(goals, 60);
  const pulse = focusPulse(displaySessions.slice(0, 40));
  const complianceRate = goals.length
    ? Math.round((goals.filter((g) => g.completed).length / goals.length) * 100)
    : 0;

  const subjectStats = subjectBreakdown(displaySessions);
  const deep = deepAnalytics(displaySessions);
  const focusToday = focusScoreForToday(todaySessions);
  const challenges = dbChallenges.map(c => ({
    id: c._id,
    title: c.title,
    description: c.description,
    target: c.targetValue,
    value: c.currentValue,
    completed: c.isCompleted,
    rewardXp: c.rewardXp,
    rewardBadge: c.rewardBadge
  }));

  const energyPatternTracking = energyPattern(displaySessions);
  const aiCoach = coachSuggestions(displaySessions, deep, subjectStats.weakAlerts, streak, energyPatternTracking);
  const consistencyScore7d = weekly.weeklyCompletionPercent;
  const remainingMinutes = Math.max(0, (todayGoal?.targetMinutes || 0) - (todayGoal?.studiedMinutes || 0));
  const hoursRemaining = Math.ceil(remainingMinutes / 60);
  const timeMessage = remainingMinutes > 0
    ? `${hoursRemaining} ${hoursRemaining === 1 ? 'hour' : 'hours'} left to finish goal`
    : "Goal completed for today";

  const timePressure = {
    remainingMinutes,
    message: timeMessage
  };
  const smartReminder = remainingMinutes > 0
    ? `You're ${Math.ceil(remainingMinutes / 60)} hour behind today.`
    : "You're on track today.";
  const quitReasons = quitReasonsSummary(sessions.slice(0, 60));
  const endReport = endOfDayReport(todayGoal, streak);
  const motivationReminder = user?.motivationWhy
    ? `You said you are studying for: ${user.motivationWhy}. Act like it.`
    : "";
  const momentum = computeMomentum(goals);
  const comebackMode = comebackModeData(goals, user?.goalConfig?.dailyMinutes || 180);
  const microGoals = microGoalsFromTarget(todayGoal?.targetMinutes || 180, todayGoal?.studiedMinutes || 0);
  const sessionQuality = qualityBreakdown(sessions.slice(0, 60));
  const weeklyReality = weeklyRealityReport(goals);
  const futureYou = futureProjection(weekly.weeklyStudyHours, consistencyScore7d);
  const habitBuilder = habitBuilderPlan(streak, deep);
  const softLockMode = softLockData(todayGoal, user?.preferredStudyTime || "20:00");
  const recovery = missedDayRecovery(goals, todayGoal);
  const effortResult = effortVsResult(goals);
  const weakDay = weakDayDetection(goals);
  const lazy = lazyPattern(sessions);
  const selfRank = weeklySelfRank(goals);
  const monthly = monthlyProgress(goals);
  const replay = sessionReplay(todaySessions);
  
  const pressure = pressureNotifications(remainingMinutes, streak, weakDay, recovery);

  return {
    user: {
      _id: user._id,
      name: user.name,
      college: user.college,
      level: user.level,
      xp: user.xp,
      pet: user.pet,
      streak: user.streak
    },
    todayGoal,
    identity: {
      type: user?.identityType || "Serious",
      strictness: identity.strictness,
      message: identity.line
    },
    startRitual: {
      title: "START YOUR DAY",
      goalMinutes: todayGoal?.targetMinutes || 0
    },
    streak,
    recovery,
    punishmentActive,
    totals: {
      totalStudyHours: +(totalMinutes / 60).toFixed(1),
      totalCompletedDays: goals.filter((g) => g.completed).length,
      totalMissedDays: streak.missed
    },
    weekly,
    history,
    pulse,
    complianceRate,
    consistencyScore7d,
    effortVsResult: effortResult,
    weakDayDetection: weakDay,
    pressureNotifications: pressure,
    timePressure,
    smartReminder,
    endOfDayReport: endReport,
    weeklyRealityReport: weeklyReality,
    futureYouReminder: futureYou,
    motivationReminder,
    habitLoop: {
      trigger: "Reminder",
      action: "Start timer",
      reward: "XP + streak pressure"
    },
    momentum,
    comebackMode,
    microGoals,
    sessionQuality,
    autoHabitBuilder: habitBuilder,
    softLockMode,
    energyPatternTracking,
    lazyPattern: lazy,
    weeklySelfRank: selfRank,
    longTermProgress: monthly,
    sessionReplay: replay,
    identityReminder: `You chose to be ${user?.identityType || "Serious"}. Act like it.`,
    focusScore: focusToday,
    gamification: {
      xp: user?.xp || 0,
      level: user?.level || 1,
      badges: user?.badges || [],
      nextLevelXp: (user?.level || 1) * 600
    },
    challenges,
    goalTypes: {
      dailyMinutes: user?.goalConfig?.dailyMinutes || 180,
      weeklyTargetMinutes: user?.goalConfig?.weeklyTargetMinutes || 1200,
      weeklySessionTarget: user?.goalConfig?.weeklySessionTarget || 7,
      todaySessionCount: todaySessions.length
    },
    subjectTracking: subjectStats,
    deepAnalytics: deep,
    distractionReflection: {
      reasons: quitReasons,
      topReason: quitReasons[0]?.reason || ""
    },
    aiCoach,
    roastMessage: punishmentActive && user?.roastMode
      ? roastLines[Math.floor(Math.random() * roastLines.length)]
      : "",
    aiSuggestions: aiCoach,
    breakSuggestions: getBreakSuggestions(todayGoal?.studiedMinutes || 0),
    antiCheat: {
      tabSwitchDetected: todaySessions.some((s) => (s.pauseCount || 0) > 0),
      idleDetected: todaySessions.some((s) => (s.inactiveSeconds || 0) > 0),
      randomCheckEnabled: true
    },
    premiumHooks: {
      lockedAnalytics: !user.isPremium,
      lockedAiInsights: !user.isPremium,
      lockedAdvancedReports: !user.isPremium
    },
    brutalMessage: weekly.weeklyWastedHours > 0
      ? `You wasted ${weekly.weeklyWastedHours} hours this week. Discipline up.`
      : "No wasted hours this week. Stay ruthless."
  };
};

const getLeaderboard = async (userId, filter = "global", limit = 100, page = 1) => {
  const parsedLimit = Math.min(Math.max(1, parseInt(limit) || 100), 200);
  const parsedPage = Math.max(1, parseInt(page) || 1);
  const skip = (parsedPage - 1) * parsedLimit;

  let query = {};
  if (filter && filter !== "global" && filter !== "friends") {
    query.college = filter;
  }

  if (filter === "friends" && userId) {
    const user = await User.findById(userId);
    if (user) {
      const friendIds = (user.friends || []).map(id => {
        if (!id) return null;
        if (typeof id === "object" && id._id) return id._id.toString();
        return id.toString();
      }).filter(Boolean);
      friendIds.push(userId.toString());
      query._id = { $in: friendIds };
    }
  }

  const users = await User.find(query)
    .sort({ xp: -1 })
    .skip(skip)
    .limit(parsedLimit);

  const mapped = users.map(u => ({
    _id: u._id,
    name: u.name,
    xp: u.xp,
    level: u.level,
    streak: u.streak?.current || 0,
    college: u.college
  }));

  const total = await User.countDocuments(query);

  return {
    leaderboard: mapped,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      pages: Math.ceil(total / parsedLimit)
    }
  };
};

const findMentors = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return [];

  const mentors = await User.find({
    _id: { $ne: userId },
    $or: [
      { college: user.college },
      { identityType: "Hardcore" }
    ],
    level: { $gt: user.level }
  }).sort({ level: -1 }).limit(5);

  return mentors.map(m => ({
    _id: m._id,
    name: m.name,
    level: m.level,
    college: m.college,
    identityType: m.identityType
  }));
};

const getBreakSuggestions = (sessionMinutes) => {
  if (sessionMinutes < 25) return "Stay focused. Minimum viable block not yet reached.";
  if (sessionMinutes < 50) return "5-minute micro-break recommended. Hydrate and stretch.";
  if (sessionMinutes < 90) return "15-minute neural reset recommended. Step away from screens.";
  return "Protocol 90: Mandatory 30-minute recovery required for neural preservation.";
};

module.exports = {
  todayKey,
  ensureDailyGoal,
  recalculateDailyTotals,
  dashboardForUser,
  applyXpAndBadges,
  getLeaderboard,
  findMentors,
  getBreakSuggestions
};
