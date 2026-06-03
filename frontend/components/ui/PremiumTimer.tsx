import React, { useEffect, useRef } from 'react';
import { StudySession } from '../../lib/types';

interface PremiumTimerProps {
  activeSession: StudySession | null;
  studyMode: string;
  plannedDuration: number;
  elapsed: number;
  formatHMS: (s: number) => string;
}

export default function PremiumTimer({ 
  activeSession, 
  studyMode, 
  plannedDuration, 
  elapsed, 
  formatHMS 
}: PremiumTimerProps) {
  const notifiedRef = useRef(false);
  const [progress, setProgress] = React.useState(0);

  useEffect(() => {
    if (!activeSession) {
      setProgress(0);
      notifiedRef.current = false;
      return;
    }
  }, [activeSession]);

  useEffect(() => {
    const totalSecs = Math.max(1, (activeSession?.plannedDurationMinutes || (studyMode === "pomodoro" ? 25 : studyMode === "deep" ? 50 : plannedDuration)) * 60);
    const p = Math.min(100, (elapsed / totalSecs) * 100);
    setProgress(isNaN(p) ? 0 : p);

    if (activeSession?.status === "running" && elapsed >= totalSecs && !notifiedRef.current) {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("GrindLock Alert", { 
          body: "Target duration reached. Take a break or lock in for overtime.",
          icon: "/images/logo.png"
        });
      }
      notifiedRef.current = true;
    }
  }, [elapsed, activeSession, studyMode, plannedDuration]);

  return (
    <div className="relative flex items-center justify-center">
      <style jsx>{`
        .timer-circle {
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: conic-gradient(var(--accent) var(--progress), transparent 0);
          mask: radial-gradient(farthest-side, transparent calc(100% - 8px), #fff 0);
          -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 8px), #fff 0);
          transition: --progress 1s linear;
        }
        @property --progress {
          syntax: '<percentage>';
          inherits: false;
          initial-value: 0%;
        }
      `}</style>
      <div 
        className="timer-circle" 
        style={{ ["--progress" as string]: `${progress}%` }} 
      />
      <div className={`timer-display absolute inset-0 flex items-center justify-center text-6xl font-black tabular-nums ${activeSession?.status === "running" ? "animate-pulse" : ""}`}>
        {formatHMS(elapsed)}
      </div>
    </div>
  );
}
