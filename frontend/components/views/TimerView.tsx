import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer as TimerIcon, Play, Pause, RefreshCw, AlertTriangle, Music } from "lucide-react";
import { StudySession } from "../../lib/types";
import PomodoroTimer from "../ui/PomodoroTimer";
import SpotifyPlayer from "../ui/SpotifyPlayer";
import toast from "react-hot-toast";

interface TimerViewProps {
  activeSession: StudySession | null;
  elapsed: number;
  plannedDuration: number;
  status: "running" | "paused" | "idle";
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  formatHMS: (s: number) => string;
  onSetDuration?: (mins: number, mode: "pomodoro" | "deep" | "custom") => void;
}

const TimerView: React.FC<TimerViewProps> = ({ 
  activeSession, 
  elapsed, 
  plannedDuration, 
  status,
  onStart,
  onPause,
  onResume,
  onEnd,
  formatHMS,
  onSetDuration
}) => {
  const [showMusic, setShowMusic] = useState(false);
  const progress = plannedDuration > 0 ? (elapsed / (plannedDuration * 60)) * 100 : 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        if (status === "idle") {
          onStart();
        } else if (status === "running") {
          onPause();
        } else if (status === "paused") {
          onResume();
        }
      } else if (e.code === "Escape") {
        if (status !== "idle") {
          e.preventDefault();
          onEnd();
        }
      } else if (status === "idle" && onSetDuration) {
        if (e.key === "1") {
          e.preventDefault();
          onSetDuration(25, "pomodoro");
          toast.success("Preset: Pomodoro Block (25m) locked.");
        } else if (e.key === "2") {
          e.preventDefault();
          onSetDuration(50, "deep");
          toast.success("Preset: Deep Work Block (50m) locked.");
        } else if (e.key === "3") {
          e.preventDefault();
          onSetDuration(90, "custom");
          toast.success("Preset: Extended block (90m) locked.");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status, onStart, onPause, onResume, onEnd, onSetDuration]);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 py-12 items-start">
      <div className="lg:col-span-2 space-y-12">
        {activeSession?.studyMode === "pomodoro" && status !== "idle" ? (
          <PomodoroTimer onComplete={onPause} />
        ) : (
          <div className="glass-card p-12 text-center">
            <div className="relative inline-block mb-12">
              <svg className="w-full max-w-[320px] aspect-square -rotate-90" viewBox="0 0 320 320">
                <circle cx="160" cy="160" r="150" className="stroke-white/5 fill-none" strokeWidth="8" />
                <motion.circle 
                  cx="160" cy="160" r="150" 
                  className="stroke-accent fill-none" 
                  strokeWidth="8" 
                  strokeDasharray={942}
                  animate={{ strokeDashoffset: 942 - (942 * Math.min(100, progress)) / 100 }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[10px] font-black tracking-[0.3em] text-muted mb-2 uppercase">Neural Tempo</p>
                <h2 className="display-lg text-6xl tabular-nums">{formatHMS(elapsed)}</h2>
              </div>
            </div>

            <div className="flex justify-center gap-6">
              {status === "idle" ? (
                <button 
                  onClick={onStart} 
                  aria-label="Start study session"
                  className="btn-primary px-12 py-4 rounded-2xl flex items-center gap-3 shadow-[0_0_30px_rgba(123,97,255,0.2)]"
                >
                  <Play size={20} fill="currentColor" /> INITIALIZE MISSION
                </button>
              ) : (
                <>
                  {status === "running" ? (
                    <button 
                      onClick={onPause} 
                      aria-label="Pause session"
                      className="nav-btn p-6 rounded-2xl bg-white/5"
                    >
                      <Pause size={24} fill="currentColor" />
                    </button>
                  ) : (
                    <button 
                      onClick={onResume} 
                      aria-label="Resume session"
                      className="nav-btn p-6 rounded-2xl bg-accent text-black shadow-lg shadow-accent/20"
                    >
                      <Play size={24} fill="currentColor" />
                    </button>
                  )}
                  <button 
                    onClick={onEnd} 
                    aria-label="End session"
                    className="btn-danger px-12 py-4 rounded-2xl flex items-center gap-3"
                  >
                    <RefreshCw size={20} /> TERMINATE MISSION
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="glass-card p-6 border-accent/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-accent flex items-center gap-2">
              <Music size={14} /> Focus Uplink
            </h3>
            <button 
              onClick={() => setShowMusic(!showMusic)}
              className="text-[8px] font-black uppercase tracking-widest text-muted hover:text-white transition-colors"
            >
              {showMusic ? "MINIMIZE" : "EXPAND"}
            </button>
          </div>
          {showMusic ? (
            <SpotifyPlayer />
          ) : (
            <div className="p-8 text-center bg-white/5 rounded-xl border border-white/5">
              <Music size={24} className="mx-auto mb-4 text-muted opacity-20" />
              <p className="text-[10px] font-bold text-muted leading-relaxed">Ambient neural frequencies recommended for deep work blocks.</p>
              <button onClick={() => setShowMusic(true)} className="mt-4 text-[10px] text-accent font-black uppercase tracking-widest">Connect Spotify</button>
            </div>
          )}
        </div>

        <div className="glass-card p-6 bg-gradient-to-br from-accent/10 to-transparent border-none">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted mb-4 flex items-center gap-2">
            <AlertTriangle size={14} className="text-warning" /> Risk Protocol
          </h3>
          <p className="text-[10px] font-bold text-white/60 leading-relaxed italic">
            "Neural focus is a limited resource. Do not attempt missions exceeding 90 minutes without a cooling phase."
          </p>
        </div>
      </div>
    </div>
  );
};

export default TimerView;
