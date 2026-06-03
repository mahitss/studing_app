import { useState, useEffect, useRef, useCallback } from 'react';
import { z } from 'zod';
import { useStore } from '../lib/store';
import { 
  startSession, 
  pauseSession, 
  resumeSession, 
  endSession, 
  fetchDashboard,
  getTodaySessions
} from '../lib/api';

const SessionSchema = z.object({
  _id: z.string(),
  status: z.enum(["running", "paused", "completed"]),
  startedAt: z.string(),
  lastStartedAt: z.string().nullish().transform(val => val ?? undefined),
  endedAt: z.string().nullish().transform(val => val ?? undefined),
  elapsedSeconds: z.number().default(0),
  focusedMinutes: z.number().default(0),
  pauseCount: z.number().default(0),
  inactiveSeconds: z.number().default(0),
  subject: z.string().nullish().transform(val => val ?? undefined),
  studyMode: z.enum(["pomodoro", "deep", "custom"]).nullish().transform(val => val ?? undefined),
  plannedDurationMinutes: z.number().nullish().transform(val => val ?? undefined),
  riskMode: z.boolean().nullish().transform(val => val ?? undefined),
  notes: z.string().nullish().transform(val => val ?? undefined),
  sessionQualityTag: z.enum(["deep", "average", "distracted", ""]).nullish().transform(val => val ?? undefined),
  pauses: z.array(z.any()).default([]),
  date: z.preprocess((val) => val || new Date().toISOString().slice(0, 10), z.string())
});

const OfflineSessionSchema = z.object({
  startedAt: z.string(),
  endedAt: z.string(),
  focusedMinutes: z.number().int().nonnegative(),
  inactiveSeconds: z.number().int().nonnegative(),
  pauseCount: z.number().int().nonnegative(),
  subject: z.string().trim().max(100),
  studyMode: z.enum(["pomodoro", "deep", "custom"]),
  plannedDurationMinutes: z.number().int().nonnegative(),
  riskMode: z.boolean(),
  notes: z.string().trim().max(1000),
  date: z.string()
});

export function useSessionManager() {
  const {
    user,
    activeSession,
    setActiveSession,
    setDashboard,
    setSessions,
    subject,
    studyMode,
    plannedDuration,
    riskMode,
    setIsActionLoading,
    setError
  } = useStore();

  const [elapsed, setElapsed] = useState(0);
  const [inactiveSeconds, setInactiveSeconds] = useState(0);

  // Visibility Inactivity Tracking
  useEffect(() => {
    if (!activeSession || activeSession.status !== "running") return;

    let hiddenStart = 0;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenStart = Date.now();
      } else if (hiddenStart > 0) {
        const hiddenDuration = Math.floor((Date.now() - hiddenStart) / 1000);
        setInactiveSeconds((prev) => prev + Math.max(0, hiddenDuration));
        hiddenStart = 0;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeSession]);

  // Timer logic
  useEffect(() => {
    if (!activeSession) {
      setElapsed(0);
      return;
    }

    const calculateElapsed = () => {
      let base = Number(activeSession.elapsedSeconds) || 0;
      if (activeSession.status === "running" && activeSession.lastStartedAt) {
        const startTime = new Date(activeSession.lastStartedAt).getTime();
        if (!isNaN(startTime)) {
          const skew = (window as any).__grindlock_skew || 0;
          const delta = Math.floor((Date.now() - skew - startTime) / 1000);
          base += Math.max(0, delta);
        }
      }
      return isNaN(base) ? 0 : base;
    };

    setElapsed(calculateElapsed());

    if (activeSession.status !== "running") return;

    const interval = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const handleStart = useCallback(async () => {
    if (!user?._id) return;

    // Haptics vibration
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(50);
    }

    const modeMinutes = studyMode === "pomodoro" ? 25 : studyMode === "deep" ? 50 : plannedDuration;
    
    // Create optimistic session structure
    const optimisticSession = {
      _id: `optimistic-${Date.now()}`,
      status: "running" as const,
      startedAt: new Date().toISOString(),
      lastStartedAt: new Date().toISOString(),
      elapsedSeconds: 0,
      focusedMinutes: 0,
      pauseCount: 0,
      inactiveSeconds: 0,
      subject: subject || "General",
      studyMode: studyMode || "custom",
      plannedDurationMinutes: modeMinutes,
      riskMode: riskMode || false,
      pauses: [],
      date: new Date().toISOString().slice(0, 10)
    };

    // Apply optimistic updates immediately
    setActiveSession(optimisticSession);
    try {
      localStorage.setItem("gl-active-session", JSON.stringify(optimisticSession));
    } catch (e) {}

    try {
      setIsActionLoading(true);
      const response = await startSession(user._id, subject, studyMode, modeMinutes, riskMode);
      if (!response || !response.session) throw new Error("Invalid response from neural uplink.");
      const { session } = response;
      const validated = SessionSchema.parse(session);
      setActiveSession(validated);
      try {
        localStorage.setItem("gl-active-session", JSON.stringify(validated));
      } catch (e) {
        console.warn("localStorage operation failed", e);
      }
    } catch (err: any) {
      // Revert optimistic state on error
      setActiveSession(null);
      try {
        localStorage.removeItem("gl-active-session");
      } catch (e) {}
      setError(err.message || "Session initialization failed.");
    } finally {
      setIsActionLoading(false);
    }
  }, [user?._id, subject, studyMode, plannedDuration, riskMode, setActiveSession, setIsActionLoading, setError]);

  const handlePauseResume = useCallback(async () => {
    if (!user?._id || !activeSession) return;

    // Haptics vibration
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(50);
    }

    const originalSession = { ...activeSession };
    const isCurrentlyRunning = activeSession.status === "running";
    const nextStatus = isCurrentlyRunning ? "paused" as const : "running" as const;
    const nowIso = new Date().toISOString();

    // Dynamically calculate and freeze elapsed seconds on pause
    let finalElapsed = activeSession.elapsedSeconds || 0;
    if (isCurrentlyRunning && activeSession.lastStartedAt) {
      const delta = Math.floor((Date.now() - new Date(activeSession.lastStartedAt).getTime()) / 1000);
      finalElapsed += Math.max(0, delta);
    }

    const updatedPauses = [...(activeSession.pauses || [])];
    if (isCurrentlyRunning) {
      updatedPauses.push({ startedAt: nowIso, reason: "manual" });
    } else {
      if (updatedPauses.length > 0) {
        const lastPause = { ...updatedPauses[updatedPauses.length - 1] };
        if (!lastPause.endedAt) lastPause.endedAt = nowIso;
        updatedPauses[updatedPauses.length - 1] = lastPause;
      }
    }

    const optimisticSession = {
      ...activeSession,
      status: nextStatus,
      elapsedSeconds: finalElapsed,
      pauseCount: isCurrentlyRunning ? (activeSession.pauseCount || 0) + 1 : activeSession.pauseCount,
      lastStartedAt: isCurrentlyRunning ? undefined : nowIso,
      pauses: updatedPauses
    };

    // Apply optimistic updates immediately
    setActiveSession(optimisticSession);
    try {
      localStorage.setItem("gl-active-session", JSON.stringify(optimisticSession));
    } catch (e) {}

    try {
      setIsActionLoading(true);
      if (isCurrentlyRunning) {
        const response = await pauseSession(user._id, activeSession._id, "manual");
        if (!response || !response.session) throw new Error("Pause protocol failed.");
        const validated = SessionSchema.parse(response.session);
        setActiveSession(validated);
        try {
          localStorage.setItem("gl-active-session", JSON.stringify(validated));
        } catch (e) {
          console.warn("localStorage operation failed", e);
        }
      } else {
        const response = await resumeSession(user._id, activeSession._id);
        if (!response || !response.session) throw new Error("Resume protocol failed.");
        const validated = SessionSchema.parse(response.session);
        setActiveSession(validated);
        try {
          localStorage.setItem("gl-active-session", JSON.stringify(validated));
        } catch (e) {
          console.warn("localStorage operation failed", e);
        }
      }
    } catch (err: any) {
      // Revert optimistic state on error
      setActiveSession(originalSession);
      try {
        localStorage.setItem("gl-active-session", JSON.stringify(originalSession));
      } catch (e) {}
      setError(err.message || "Neural link interruption.");
    } finally {
      setIsActionLoading(false);
    }
  }, [user?._id, activeSession, setActiveSession, setIsActionLoading, setError]);

  const handleEnd = useCallback(async (notes = "", antiCheatFlags = 0) => {
    if (!user?._id || !activeSession) return;

    // Trigger haptics complete alert
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([60, 40, 60]);
    }

    const notesStr = typeof notes === "string" ? notes : "";
    const sessionSubject = activeSession.subject || "General";
    const sessionMode = activeSession.studyMode || "custom";
    const sessionMinutes = activeSession.plannedDurationMinutes || 0;
    const sessionRisk = !!activeSession.riskMode;
    const sessionId = activeSession._id;
    const startedAt = activeSession.startedAt;
    const date = activeSession.date;
    const pauseCount = activeSession.pauseCount || 0;

    // Calculate final elapsed time dynamically (avoids timer ticking dependency)
    let finalElapsed = activeSession.elapsedSeconds || 0;
    if (activeSession.status === "running" && activeSession.lastStartedAt) {
      const delta = Math.floor((Date.now() - new Date(activeSession.lastStartedAt).getTime()) / 1000);
      finalElapsed += Math.max(0, delta);
    }

    // Optimistic UI update: clear session immediately for instant transitions
    setActiveSession(null);
    try {
      localStorage.removeItem("gl-active-session");
    } catch (e) {
      console.warn("localStorage operation failed", e);
    }

    try {
      setIsActionLoading(true);

      const response = await endSession(
        user._id,
        sessionId,
        inactiveSeconds,
        notesStr,
        sessionSubject,
        "manual",
        antiCheatFlags,
        "",
        sessionMode,
        sessionMinutes,
        sessionRisk
      );
      if (!response || !response.dashboard) throw new Error("End protocol synchronization failed.");
      const { dashboard: updated } = response;
      setDashboard(updated);
      
      const { sessions: sessionList } = await getTodaySessions(user._id);
      setSessions(sessionList);
      setInactiveSeconds(0);
    } catch (err: any) {
      // Offline fallback: save completed session to offline queue
      try {
        const queue = JSON.parse(localStorage.getItem("study-tracker-offline-queue") || "[]");
        const offlineSession = {
          startedAt,
          endedAt: new Date().toISOString(),
          focusedMinutes: Math.max(1, Math.round(finalElapsed / 60)),
          inactiveSeconds: inactiveSeconds,
          pauseCount,
          subject: sessionSubject,
          studyMode: sessionMode,
          plannedDurationMinutes: sessionMinutes,
          riskMode: sessionRisk,
          notes: notesStr,
          date: date || new Date().toISOString().slice(0, 10)
        };
        const validated = OfflineSessionSchema.parse(offlineSession);
        queue.push(validated);
        localStorage.setItem("study-tracker-offline-queue", JSON.stringify(queue));
      } catch (e) {
        console.warn("Failed to queue offline session:", e);
      }

      setInactiveSeconds(0);
      setError("Uplink offline. Study session queued locally and will be synchronized when connection is restored.");
    } finally {
      setIsActionLoading(false);
    }
  }, [user?._id, activeSession, inactiveSeconds, setActiveSession, setIsActionLoading, setDashboard, setSessions, setError, setInactiveSeconds]);

  return {
    elapsed,
    inactiveSeconds,
    setInactiveSeconds,
    handleStart,
    handlePauseResume,
    handleEnd
  };
}
