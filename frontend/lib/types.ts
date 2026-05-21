export type User = {
  _id: string;
  name: string;
  college: string;
  email?: string;
  xp?: number;
  level?: number;
  badges?: string[];
  ethAddress?: string;
  streak?: {
    current: number;
    longest: number;
    lastActivityDate?: string;
  };
  pet?: {
    name: string;
    type: string;
    level: number;
    happiness: number;
  };
  achievements?: Array<{
    achievementId: {
      _id: string;
      title: string;
      description: string;
      icon: string;
      category: string;
    };
    earnedAt: string;
  }>;
  studyGroups?: string[];
};

export type DailyGoal = {
  _id: string;
  userId: string;
  date: string;
  targetMinutes: number;
  studiedMinutes: number;
  completionPercent: number;
  completed: boolean;
};

export type Dashboard = {
  user: User;
  todayGoal: DailyGoal;
  identity: {
    type: "Casual" | "Serious" | "Hardcore";
    strictness: number;
    message: string;
  };
  startRitual: {
    title: string;
    goalMinutes: number;
  };
  streak: {
    current: number;
    longest: number;
    missed: number;
  };
  recovery?: {
    eligible: boolean;
    requiredMinutes: number;
    completed: boolean;
    message: string;
  };
  punishmentActive: boolean;
  totals: {
    totalStudyHours: number;
    totalCompletedDays: number;
    totalMissedDays: number;
  };
  weekly: {
    weeklyTargetHours: number;
    weeklyStudyHours: number;
    weeklyWastedHours: number;
    weeklyCompletionPercent: number;
    completedDays: number;
    weeklyGoalTypeTargetHours: number;
    weeklyGoalTypeCompletionPercent: number;
  };
  history: Array<{
    date: string;
    studiedMinutes: number;
    targetMinutes: number;
    completionPercent: number;
    completed: boolean;
    intensity: number;
    color: string;
  }>;
  pulse: {
    score: number;
    level: string;
    avgFocusMinutes: number;
    avgInactiveMinutes: number;
  };
  complianceRate: number;
  consistencyScore7d: number;
  effortVsResult?: {
    studiedHours: number;
    completionRate: number;
    message: string;
  };
  weakDayDetection?: {
    weakDay: string;
    misses: number;
    reminder: string;
  };
  pressureNotifications?: string[];
  timePressure: {
    remainingMinutes: number;
    message: string;
  };
  smartReminder: string;
  weeklyRealityReport: {
    available: boolean;
    totalHours?: number;
    missedDays?: number;
    bestDay?: string;
    worstDay?: string;
    message: string;
  };
  futureYouReminder: string;
  endOfDayReport: {
    available: boolean;
    success?: boolean;
    totalHours?: number;
    streak?: number;
    message: string;
  };
  motivationReminder: string;
  habitLoop: {
    trigger: string;
    action: string;
    reward: string;
  };
  momentum: {
    score: number;
    state: string;
    message: string;
  };
  comebackMode: {
    active: boolean;
    reducedGoalMinutes: number;
    message: string;
  };
  microGoals: Array<{
    label: string;
    targetMinutes: number;
    done: boolean;
  }>;
  sessionQuality: {
    deepPercent: number;
    averagePercent: number;
    distractedPercent: number;
  };
  autoHabitBuilder: {
    ready: boolean;
    suggestedTime: string;
    message: string;
  };
  softLockMode: {
    active: boolean;
    message: string;
  };
  energyPatternTracking: {
    strongestWindow: string;
    quitWindow: string;
    message: string;
  };
  lazyPattern?: {
    earlyQuitCount: number;
    message: string;
  };
  weeklySelfRank?: {
    rank: string;
    deltaMinutes: number;
    message: string;
  };
  longTermProgress?: {
    monthlyHours: number;
    growthPercent: number;
    trend: string;
  };
  sessionReplay?: Array<{
    sessionId: string;
    start: string;
    end?: string | null;
    minutes: number;
    subject: string;
    studyMode: "pomodoro" | "deep" | "custom";
    riskMode: boolean;
    status: "running" | "paused" | "completed";
  }>;
  identityReminder?: string;
  focusScore: {
    score: number;
    label: string;
    message: string;
  };
  gamification: {
    xp: number;
    level: number;
    badges: string[];
    nextLevelXp: number;
  };
  challenges: Array<{
    id: string;
    title: string;
    description: string;
    target: number;
    value: number;
    completed: boolean;
    rewardXp: number;
    rewardBadge: string;
  }>;
  goalTypes: {
    dailyMinutes: number;
    weeklyTargetMinutes: number;
    weeklySessionTarget: number;
    todaySessionCount: number;
  };
  subjectTracking: {
    subjects: Array<{ subject: string; minutes: number; hours: number }>;
    weakAlerts: string[];
  };
  deepAnalytics: {
    bestStudyTime: string;
    averageSessionLength: number;
    trendDirection: string;
    weekendConsistency: string;
  };
  distractionReflection: {
    reasons: Array<{ reason: string; count: number }>;
    topReason: string;
  };
  aiCoach: string[];
  roastMessage: string;
  aiSuggestions: string[];
  groups?: any[];
  mentors?: any[];
  breakSuggestions?: string;
  antiCheat: {
    tabSwitchDetected: boolean;
    idleDetected: boolean;
    randomCheckEnabled: boolean;
  };
  premiumHooks: {
    lockedAnalytics: boolean;
    lockedAiInsights: boolean;
    lockedAdvancedReports?: boolean;
  };
  brutalMessage: string;
};

export type StudySession = {
  _id: string;
  status: "running" | "paused" | "completed";
  startedAt: string;
  lastStartedAt?: string;
  endedAt?: string;
  elapsedSeconds: number;
  pauses?: Array<{
    startedAt: string;
    endedAt?: string;
    reason?: string;
  }>;
  focusedMinutes: number;
  pauseCount: number;
  inactiveSeconds: number;
  subject?: string;
  studyMode?: "pomodoro" | "deep" | "custom";
  plannedDurationMinutes?: number;
  riskMode?: boolean;
  notes?: string;
  sessionQualityTag?: "deep" | "average" | "distracted" | "";
  date: string;
};

export type LeaderboardEntry = {
  userId: string;
  name: string;
  college: string;
  studiedMinutes: number;
  completionPercent: number;
  completed: boolean;
  level?: number;
  xp?: number;
};

export type LiveFriend = {
  userId: string;
  name: string;
  level: number;
  studyingNow: boolean;
  isLive?: boolean;
  currentSubject?: string;
};
