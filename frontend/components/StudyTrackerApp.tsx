"use client";
// HEARTBEAT: 2026-04-29

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  socket,
  HAS_BACKEND,
  addFriend,
  endSession,
  fetchDashboard,
  getLiveFriends,
  getTodaySessions,
  pauseSession,
  resetSession,
  resumeSession,
  sendProgressEmail,
  setGoalConfig,
  setModes,
  startSession,
  syncOfflineSessions,
  fetchAnalytics,
  clearAuthSession,
  fetchRooms,
  createRoom,
  joinRoom,
  getAICoachReply,
  challengeDuel,
  fetchDuels,
  syncDuelProgress,
  updateRoomNotes,
  voteAmbient,
  broadcastEmergencyAlert,
  submitGroupAIQuery,
  placeXPBet,
  bootstrapUser,
  saveAuthSession
} from "../lib/api";
import { Dashboard, LiveFriend, StudySession, User } from "../lib/types";
import Sidebar from "./ui/Sidebar";
import DashboardView from "./views/DashboardView";
import TimerView from "./views/TimerView";
import ColosseumView from "./views/ColosseumView";
import SettingsView from "./views/SettingsView";
import StreakView from "./views/StreakView";
import { useStore } from "../lib/store";
import { useSocketSync } from "../hooks/useSocketSync";
import { useSessionManager } from "../hooks/useSessionManager";
import NeuralCoach from "./ui/NeuralCoach";
import NeuralAnalytics from "./ui/NeuralAnalytics";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "./ui/ErrorFallback";
import LiveStudyChamber from "./ui/LiveStudyChamber";
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend, 
  Filler 
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { 
  LayoutDashboard, 
  Timer, 
  BarChart3, 
  Flame, 
  Settings, 
  LogOut, 
  Zap, 
  TrendingUp, 
  Target, 
  Activity,
  Users,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Camera,
  Play,
  Pause,
  RefreshCw,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Wallet,
  Maximize2,
  MessageSquare,
  Send,
  Plus,
  Swords,
  Trophy,
  Box
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Memoize views for performance
const MemoizedDashboard = React.memo(DashboardView);
const MemoizedTimer = React.memo(TimerView);
const MemoizedColosseum = React.memo(ColosseumView);
const MemoizedSettings = React.memo(SettingsView);
const MemoizedStreak = React.memo(StreakView);

interface AppSettings {
  darkMode: boolean;
  roastMode: boolean;
  notifications: boolean;
  soundEnabled: boolean;
  autoPause: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  darkMode: true,
  roastMode: true,
  notifications: true,
  soundEnabled: true,
  autoPause: true
};

function formatHMS(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => v.toString().padStart(2, "0")).join(":");
}

function elapsedForSession(session: StudySession, nowMs = Date.now()) {
  if (!session) return 0;
  let base = session.elapsedSeconds || 0;
  if (session.status === "running" && session.lastStartedAt) {
    const delta = Math.floor((nowMs - new Date(session.lastStartedAt).getTime()) / 1000);
    base += Math.max(0, delta);
  }
  return base;
}

export default function StudyTrackerApp() {
  const router = useRouter();
  const {
    screen, setScreen,
    user, setUser,
    dashboard, setDashboard,
    sessions, setSessions,
    activeSession, setActiveSession,
    isInitializing, setIsInitializing,
    isActionLoading, setIsActionLoading,
    error, setError,
    subject, setSubject,
    studyMode, setStudyMode,
    plannedDuration, setPlannedDuration,
    riskMode, setRiskMode,
    rooms, setRooms,
    currentRoom, setCurrentRoom,
    duels, setDuels,
    activeDuel, setActiveDuel,
    liveFriends, setLiveFriends,
    liveMessage, setLiveMessage,
    lastSyncAt, setLastSyncAt
  } = useStore();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [friendEmail, setFriendEmail] = useState("");
  const [walletConnected, setWalletConnected] = useState(!!user?.ethAddress);
  const [timerAlert, setTimerAlert] = useState("");
  const [goalDaily, setGoalDaily] = useState(180);
  const [goalWeekly, setGoalWeekly] = useState(1200);
  const [summaryEmail, setSummaryEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  const [identityType, setIdentityType] = useState<"Casual" | "Serious" | "Hardcore">("Serious");
  const [motivationWhy, setMotivationWhy] = useState("");
  const [ritualDoneToday, setRitualDoneToday] = useState(false);
  const [stopReason, setStopReason] = useState("");
  const [sessionQualityTag, setSessionQualityTag] = useState<"deep" | "average" | "distracted" | "">("");
  const [pythonAnalytics, setPythonAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
  const [ambientTrack, setAmbientTrack] = useState<string>("none");
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Initialize custom hooks to handle complex logic
  useSocketSync();
  const { 
    elapsed, 
    handleStart, 
    handlePauseResume, 
    handleEnd,
    inactiveSeconds,
    setInactiveSeconds 
  } = useSessionManager();

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onplay = () => setAmbientPlaying(true);
      audioRef.current.onpause = () => setAmbientPlaying(false);
    }
  }, [ambientTrack]);

  const hiddenAt = useRef<number | null>(null);

  const userKey = "study-tracker-user-id";
  const authTokenKey = "study-tracker-auth-token";
  const settingsKey = "study-tracker-settings";
  const offlineQueueKey = "study-tracker-offline-queue";
  const ritualKey = `study-tracker-ritual-${new Date().toISOString().slice(0, 10)}`;

  const refreshAll = useCallback(async (userId: string) => {
    try {
      const results = await Promise.allSettled([
        fetchDashboard(userId),
        getTodaySessions(userId),
        getLiveFriends(userId)
      ]);

      const [dashRes, sessionsRes, liveRes] = results;

      const hasAuthError = results.some(res => 
        res.status === "rejected" && 
        ((res.reason as any)?.status === 401 || 
         (res.reason as any)?.message?.includes("expired") || 
         (res.reason as any)?.message?.includes("Unauthorized") || 
         (res.reason as any)?.message?.includes("Session expired"))
      );

      if (hasAuthError) {
        clearAuthSession();
        setUser(null);
        router.push("/signin");
        return;
      }

      if (dashRes.status === "fulfilled" && dashRes.value) {
        const dash = dashRes.value;
        setDashboard(dash);
        setUser(dash.user);
        setGoalDaily(dash.goalTypes.dailyMinutes);
        setGoalWeekly(dash.goalTypes.weeklyTargetMinutes);
        setIdentityType(dash.identity.type);
        if (dash.user.email && !summaryEmail) setSummaryEmail(dash.user.email);
      } else if (dashRes.status === "rejected") {
        setError("Failed to synchronize dashboard. Neural link unstable.");
      }

      if (sessionsRes.status === "fulfilled" && sessionsRes.value) {
        const { sessions: sessionList, serverTime } = sessionsRes.value;
        setSessions(sessionList);
        
        if (serverTime) {
          const skew = Date.now() - new Date(serverTime).getTime();
          (window as any).__grindlock_skew = skew;
        }
        
        const running = sessionList.find((s: StudySession) => s.status === "running" || s.status === "paused") || null;
        setActiveSession((currentActive: StudySession | null) => {
          const next = running || (currentActive?.status === "running" ? currentActive : null);
          if (next) localStorage.setItem("gl-active-session", JSON.stringify(next));
          else localStorage.removeItem("gl-active-session");
          return next;
        });

        if (running) {
          if (running.subject) setSubject(running.subject);
          if (running.studyMode) setStudyMode(running.studyMode);
          if (running.plannedDurationMinutes) setPlannedDuration(running.plannedDurationMinutes);
          if (typeof running.riskMode === "boolean") setRiskMode(Boolean(running.riskMode));
        }
      }

      if (liveRes.status === "fulfilled" && liveRes.value) {
        setLiveFriends(liveRes.value.friends || []);
        setLiveMessage(liveRes.value.liveMessage || "");
      }

      setLastSyncAt(Date.now());
    } catch (err: any) {
      setError("Critical telemetry failure. Protocol: Manual Refresh.");
    }
  }, [setDashboard, setUser, setGoalDaily, setGoalWeekly, setIdentityType, summaryEmail, setSummaryEmail, setError, setSessions, setActiveSession, setSubject, setStudyMode, setPlannedDuration, setRiskMode, setLiveFriends, setLiveMessage, setLastSyncAt]);

  const handleManualOffline = () => {
    localStorage.setItem("study-tracker-pref-mock", "true");
    setError("");
    window.location.reload();
  };

  useEffect(() => {
    const rawSettings = localStorage.getItem(settingsKey);
    if (rawSettings) {
      try { 
        const parsed = JSON.parse(rawSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed }); 
      } catch (e) {
        console.error("Failed to parse settings:", e);
        setError("Local configuration corrupted. Resetting to defaults.");
      }
    }

    if ("Notification" in window) {
      Notification.requestPermission().then(setNotificationPermission);
    }

    const init = async () => {
      try {
        setIsInitializing(true);
        const userId = localStorage.getItem(userKey);
        if (!userId) {
          setIsInitializing(false);
          router.push("/signin");
          return;
        }
        await refreshAll(userId);
      } catch (err: any) {
        setError("Neural link severed.");
        if (err.status === 401 || err.message?.includes("expired") || err.message?.includes("Unauthorized")) {
          clearAuthSession();
          setUser(null);
          router.push("/signin");
        }
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, [refreshAll, setError, setIsInitializing]);

  // Background Sync & Cross-Tab State Synchronization
  useEffect(() => {
    if (!user?._id) return;

    // 1. Storage Event Listener for Cross-Tab Sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "gl-active-session") {
        const raw = localStorage.getItem("gl-active-session");
        if (raw) {
          try {
            setActiveSession(JSON.parse(raw));
          } catch {}
        } else {
          setActiveSession(null);
        }
      }
      if (e.key === "study-tracker-mock-store-v1" && user?._id) {
        // Refetch dashboard and sessions to sync state across tabs
        fetchDashboard(user._id).then(setDashboard).catch(() => {});
        getTodaySessions(user._id).then(({ sessions }) => setSessions(sessions)).catch(() => {});
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // 2. Offline Sync Function
    const performOfflineSync = async () => {
      if (!HAS_BACKEND) return; // Only sync to backend in online mode
      try {
        const rawQueue = localStorage.getItem("study-tracker-offline-queue");
        if (!rawQueue) return;
        const queuedSessions = JSON.parse(rawQueue);
        if (!Array.isArray(queuedSessions) || queuedSessions.length === 0) return;

        console.log(`[GrindLock Sync] Found ${queuedSessions.length} offline sessions. Initiating sync...`);
        const syncRes = await syncOfflineSessions(user._id, queuedSessions);
        if (syncRes && syncRes.synced > 0) {
          localStorage.removeItem("study-tracker-offline-queue");
          toast.success(`${syncRes.synced} offline study session(s) synchronized successfully!`);
          if (syncRes.dashboard) {
            setDashboard(syncRes.dashboard);
          }
          const { sessions: sessionList } = await getTodaySessions(user._id);
          setSessions(sessionList);
        }
      } catch (err) {
        console.warn("[GrindLock Sync] Background synchronization failed:", err);
      }
    };

    // Trigger sync on mount, when coming online, or periodically
    performOfflineSync();
    window.addEventListener("online", performOfflineSync);
    const syncInterval = setInterval(performOfflineSync, 60000); // Check every minute

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("online", performOfflineSync);
      clearInterval(syncInterval);
    };
  }, [user, setDashboard, setActiveSession, setSessions]);

  const handleCreateRoom = async () => {
    if (!user) return;
    try {
      setIsActionLoading(true);
      const room = await createRoom(user._id, { name: `${user.name}'s Focus Hub` });
      setRooms([...rooms, room]);
      handleJoinRoom(room._id);
    } catch {
      setError("Failed to initialize cluster.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!user) return;
    try {
      const room = await joinRoom(user._id, roomId);
      setCurrentRoom(room);
    } catch {
      setError("Neutral connection to room failed.");
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    setUser(null);
    window.location.reload();
  };

  const handleGuestLogin = async () => {
    try {
      setIsActionLoading(true);
      const response = await bootstrapUser("Focused Student", "General", "Serious", "Skill");
      saveAuthSession(response.user._id, response.token);
      setUser(response.user);
      refreshAll(response.user._id);
    } catch {
      setError("Guest protocol failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleGoalUpdate = async () => {
    if (!user) return;
    try {
      setIsActionLoading(true);
      await setGoalConfig(user._id, { dailyMinutes: goalDaily, weeklyTargetMinutes: goalWeekly });
      await refreshAll(user._id);
    } catch {
      setError("Failed to calibrate goals. Protocol rejected.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleIdentityUpdate = async () => {
    if (!user) return;
    try {
      setIsActionLoading(true);
      await setModes(user._id, settings.roastMode, identityType, motivationWhy);
      await refreshAll(user._id);
    } catch {
      setError("Identity shift failed. Neural resistance detected.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!user) return;
    try {
      setEmailStatus("transmitting");
      const res = await sendProgressEmail(user._id, summaryEmail);
      if (res.ok) {
        setEmailStatus("delivered");
        setTimeout(() => setEmailStatus(""), 5000);
      }
    } catch {
      setEmailStatus("error");
      setError("Data transmission to external node failed.");
    }
  };

  useEffect(() => {
    document.body.dataset.theme = settings.darkMode ? "dark" : "light";
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (screen === "analytics" && user) {
      const getTelemetry = async () => {
        try {
          setLoadingAnalytics(true);
          const data = await fetchAnalytics(user._id);
          setPythonAnalytics(data);
          setAnalyticsLoaded(true);
        } catch (err) {
          console.error("Failed to load telemetry:", err);
          setError("Failed to synchronize with neural analytics processor.");
        } finally {
          setLoadingAnalytics(false);
        }
      };
      getTelemetry();
    }
  }, [screen, user, setError]);

  useEffect(() => {
    setWalletConnected(!!user?.ethAddress);
  }, [user?.ethAddress]);

  useEffect(() => {
    const onInactive = () => {
      if (activeSession?.status === "running" && !hiddenAt.current) {
        hiddenAt.current = Date.now();
      }
    };

    const onActive = () => {
      if (activeSession?.status === "running" && hiddenAt.current) {
        const delta = Math.round((Date.now() - hiddenAt.current) / 1000);
        setInactiveSeconds((prev) => prev + Math.max(0, delta));
        hiddenAt.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) onInactive();
      else onActive();
    };

    window.addEventListener("blur", onInactive);
    window.addEventListener("focus", onActive);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", onInactive);
      window.removeEventListener("focus", onActive);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeSession?.status, setInactiveSeconds]); // Minimal dependencies to prevent re-subscriptions

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'd': setScreen('dashboard'); break;
          case 't': setScreen('timer'); break;
          case 'a': setScreen('analytics'); break;
          case 'm': setScreen('streak'); break;
          case 'c': setScreen('colosseum'); break;
          case 's': setScreen('settings'); break;
        }
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [setScreen]);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Use refs for handlers to avoid effect re-runs when handlers change
  const handleStartRef = useRef(handleStart);
  const handlePauseResumeRef = useRef(handlePauseResume);
  const handleEndRef = useRef(handleEnd);
  const setScreenRef = useRef(setScreen);

  useEffect(() => {
    handleStartRef.current = handleStart;
    handlePauseResumeRef.current = handlePauseResume;
    handleEndRef.current = handleEnd;
    setScreenRef.current = setScreen;
  });

  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
        
        if (transcript.includes("start timer") || transcript.includes("begin focus")) {
          handleStartRef.current();
        } else if (transcript.includes("pause session") || transcript.includes("hold focus")) {
          handlePauseResumeRef.current();
        } else if (transcript.includes("stop focus") || transcript.includes("finish session")) {
          handleEndRef.current();
        } else if (transcript.includes("go to dashboard")) {
          setScreenRef.current("dashboard");
        } else if (transcript.includes("open analytics")) {
          setScreenRef.current("analytics");
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === 'not-allowed') setIsListening(false);
      };

      let restartCount = 0;
      let lastRestart = Date.now();

      recognition.onend = () => {
        if (isListening) {
          const now = Date.now();
          if (now - lastRestart < 1000) {
            restartCount++;
          } else {
            restartCount = 0;
          }
          lastRestart = now;

          if (restartCount > 5) {
            console.error("Speech recognition restarting too rapidly. Disabling listener.");
            setIsListening(false);
            setError("Speech recognition disconnected due to repeated errors.");
            return;
          }

          try {
            recognition.start();
          } catch (e) {
            console.error("Speech restart failed:", e);
          }
        }
      };

      return () => {
        recognition.onend = null;
        recognition.stop();
      };
    }
  }, [isListening, setError]);

  const toggleVoiceControl = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const navItems = [
    { id: "dashboard", label: "Neural Core", icon: LayoutDashboard, aria: "Navigate to Dashboard (Alt+D)" },
    { id: "timer", label: "Neural Sync", icon: Timer, aria: "Navigate to Focus Timer (Alt+T)" },
    { id: "analytics", label: "Neural Map", icon: BarChart3, aria: "Navigate to Analytics (Alt+A)" },
    { id: "streak", label: "Neural Persistence", icon: Flame, aria: "View Momentum and Streaks" },
    { id: "colosseum", label: "Tactical Center", icon: Swords, aria: "Enter Colosseum Duels" },
    { id: "settings", label: "Neural Config", icon: Settings, aria: "Navigate to Settings (Alt+S)" }
  ];

  if (isInitializing && !user) return (
    <div className="auth-wrapper relative z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <p className="text-xs font-black tracking-widest text-accent animate-pulse uppercase">Synchronizing OS...</p>
      </div>
    </div>
  );

  if (!user) return (
    <div className="auth-wrapper relative z-[200]">
      <div className="auth-form text-center p-12 glass-card border-none shadow-2xl">
        <Zap size={48} className="text-accent mx-auto mb-8 animate-pulse" />
        <h1 className="display-lg mb-4">Neural Auth Required</h1>
        <p className="text-muted mb-8 italic">{error || "Protocol identity not confirmed."}</p>
        <button onClick={() => router.push("/signin")} className="btn-primary w-full py-4 font-bold tracking-widest">INITIALIZE NEURAL LINK</button>
        <button onClick={handleGuestLogin} disabled={isActionLoading} className="btn-secondary w-full mt-4 py-3 text-xs font-black uppercase tracking-widest">ENTER AS GUEST</button>
      </div>
    </div>
  );

  return (
    <div className="flex bg-[#050505] min-h-screen text-white selection:bg-accent selection:text-black font-sans">
      <Sidebar 
        user={user!} 
        dashboard={dashboard} 
        activeScreen={screen} 
        onScreenChange={(s) => { setScreen(s); setIsSidebarOpen(false); }} 
        onLogout={handleLogout} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 lg:ml-80 p-6 lg:p-12 transition-all duration-300">
        <header className="flex items-center justify-between mb-8 lg:mb-16">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-white/5 rounded-lg text-muted"
              aria-label="Open Sidebar"
            >
              <LayoutDashboard size={24} />
            </button>
            <div>
              <h2 className="display-md text-2xl lg:text-4xl uppercase tracking-tighter">
                {navItems.find(n => n.id === screen)?.label || "Neural Node"}
              </h2>
              <p className="text-[10px] text-muted font-black uppercase tracking-widest mt-1 lg:mt-2">
                System Health: <span className="text-success animate-pulse">Optimal</span> • Last Sync: {new Date(lastSyncAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 lg:gap-6">
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">XP Points</p>
              <p className="text-xl font-black">{dashboard?.gamification?.xp || 0}</p>
            </div>
            <button 
              onClick={toggleVoiceControl}
              className={`p-2 rounded-lg transition-all flex items-center gap-2 ${isListening ? 'bg-danger/20 border-danger text-danger animate-pulse shadow-[0_0_15px_rgba(229,72,77,0.3)]' : 'nav-btn hover:bg-white/5 text-white/50'}`}
              title={isListening ? "Voice Protocol Active" : "Initialize Voice Protocol (Start Timer/Pause/Stop)"}
              aria-label={isListening ? "Voice Protocol Active" : "Initialize Voice Protocol"}
            >
              {isListening ? <Mic size={20} /> : <MicOff size={20} />}
              <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">
                {isListening ? "Listening" : "Voice"}
              </span>
            </button>
            <button 
              className={`p-2 rounded-lg transition-all ${isCoachOpen ? "bg-accent/20 text-accent" : "nav-btn hover:bg-white/5"}`}
              onClick={() => setIsCoachOpen(true)}
            >
              <MessageSquare size={20} />
            </button>
            <button 
              className={`btn-primary text-[10px] lg:text-xs py-2 px-4 lg:px-6 transition-all ${activeSession ? "bg-danger/20 border border-danger/40 text-danger hover:bg-danger/30 shadow-none" : ""}`} 
              onClick={() => {
                if (activeSession) setScreen("timer");
                else { handleStart(); setScreen("timer"); }
              }}
            >
              {activeSession ? "EN ROUTE" : "LOCKED IN"}
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {screen === "dashboard" && (
              <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => { setError(null); if (user) refreshAll(user._id); }}>
                <MemoizedDashboard user={user!} dashboard={dashboard} goalDaily={goalDaily} />
              </ErrorBoundary>
            )}
            {screen === "timer" && (
              <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => { setError(null); if (user) refreshAll(user._id); }}>
                <MemoizedTimer 
                  activeSession={activeSession}
                  elapsed={elapsed}
                  plannedDuration={plannedDuration}
                  status={activeSession ? (activeSession.status === "paused" ? "paused" : "running") : "idle"}
                  onStart={handleStart}
                  onPause={handlePauseResume}
                  onResume={handlePauseResume}
                  onEnd={handleEnd}
                  formatHMS={formatHMS}
                  onSetDuration={(mins, mode) => {
                    setPlannedDuration(mins);
                    setStudyMode(mode);
                  }}
                />
              </ErrorBoundary>
            )}
            {screen === "analytics" && (
              <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => { setError(null); if (user) refreshAll(user._id); }}>
                <NeuralAnalytics data={pythonAnalytics} />
              </ErrorBoundary>
            )}
            {screen === "streak" && (
              <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => { setError(null); if (user) refreshAll(user._id); }}>
                <MemoizedStreak dashboard={dashboard} />
              </ErrorBoundary>
            )}
            {screen === "colosseum" && (
              <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => { setError(null); if (user) refreshAll(user._id); }}>
                <MemoizedColosseum 
                  rooms={rooms} 
                  currentRoom={currentRoom} 
                  onJoinRoom={handleJoinRoom} 
                  onCreateRoom={handleCreateRoom} 
                />
              </ErrorBoundary>
            )}
            {screen === "settings" && (
              <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => { setError(null); if (user) refreshAll(user._id); }}>
                <MemoizedSettings 
                  user={user!}
                  dashboard={dashboard}
                  goalDaily={goalDaily}
                  goalWeekly={goalWeekly}
                  identityType={identityType}
                  motivationWhy={motivationWhy}
                  summaryEmail={summaryEmail}
                  emailStatus={emailStatus}
                  setGoalDaily={setGoalDaily}
                  setGoalWeekly={setGoalWeekly}
                  setIdentityType={setIdentityType}
                  setMotivationWhy={setMotivationWhy}
                  setSummaryEmail={setSummaryEmail}
                  onGoalUpdate={handleGoalUpdate}
                  onIdentityUpdate={handleIdentityUpdate}
                  onSendEmail={handleSendEmail}
                />
              </ErrorBoundary>
            )}
          </motion.div>
        </AnimatePresence>

        {currentRoom && (
          <LiveStudyChamber 
            onClose={() => setCurrentRoom(null)} 
            room={currentRoom}
            socket={socket}
            userId={user!._id}
          />
        )}

        {isCoachOpen && <NeuralCoach userId={user!._id} isOpen={isCoachOpen} onClose={() => setIsCoachOpen(false)} />}

        {error && (
          <div className="fixed bottom-6 right-6 left-6 lg:left-auto lg:bottom-10 lg:right-10 z-[200] lg:max-w-sm">
            <div className="p-6 glass border-l-4 border-l-danger shadow-2xl">
              <div className="flex gap-4">
                <AlertTriangle className="text-danger shrink-0" size={20} />
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-danger mb-1">System Liaison Error</p>
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </div>
              <button onClick={() => setError("")} className="mt-4 text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100">Dismiss</button>
            </div>
          </div>
        )}

        {webcamEnabled && activeSession?.status === "running" && (
          <div className="fixed bottom-6 right-6 w-48 rounded-xl overflow-hidden shadow-2xl border border-danger z-50">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto grayscale opacity-80" />
          </div>
        )}
      </main>

      {ambientTrack !== "none" && (
        <audio 
          ref={audioRef} 
          src={ambientTrack === "brown" 
            ? "https://cdn.pixabay.com/download/audio/2021/04/10/audio_50b0b8c6ab.mp3?filename=brown-noise-10-minutes-76077.mp3" 
            : "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3"
          } 
          onError={() => {
            setError("Ambient uplink failed. CDNs may be restricted.");
            setAmbientTrack("none");
          }}
          loop 
          className="hidden" 
        />
      )}
    </div>
  );
}


