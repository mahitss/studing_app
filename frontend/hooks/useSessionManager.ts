import { useState, useEffect, useRef } from 'react';
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

  const handleStart = async () => {
    if (!user?._id) return;
    try {
      setIsActionLoading(true);
      const modeMinutes = studyMode === "pomodoro" ? 25 : studyMode === "deep" ? 50 : plannedDuration;
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
      setError(err.message || "Session initialization failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePauseResume = async () => {
    if (!user?._id || !activeSession) return;
    try {
      setIsActionLoading(true);
      if (activeSession.status === "running") {
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
      setError(err.message || "Neural link interruption.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEnd = async (notes = "", antiCheatFlags = 0) => {
    if (!user?._id || !activeSession) return;
    try {
      setIsActionLoading(true);
      const sessionSubject = activeSession.subject || "General";
      const sessionMode = activeSession.studyMode || "custom";
      const sessionMinutes = activeSession.plannedDurationMinutes || 0;
      const sessionRisk = !!activeSession.riskMode;

      const response = await endSession(
        user._id,
        activeSession._id,
        inactiveSeconds,
        notes,
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
      setActiveSession(null);
      try {
        localStorage.removeItem("gl-active-session");
      } catch (e) {
        console.warn("localStorage operation failed", e);
      }
      
      const { sessions: sessionList } = await getTodaySessions(user._id);
      setSessions(sessionList);
      setInactiveSeconds(0);
    } catch (err: any) {
      setError(err.message || "Telemetry upload failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return {
    elapsed,
    inactiveSeconds,
    setInactiveSeconds,
    handleStart,
    handlePauseResume,
    handleEnd
  };
}
