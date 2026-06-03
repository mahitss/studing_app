import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer as TimerIcon, Play, Pause, RefreshCw, AlertTriangle, Music, Target, Sparkle } from "lucide-react";
import { StudySession } from "../../lib/types";
import PomodoroTimer from "../ui/PomodoroTimer";
import SpotifyPlayer from "../ui/SpotifyPlayer";
import toast from "react-hot-toast";
import { useStore } from "../../lib/store";
import TodoWidget from "../ui/TodoWidget";

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
  isActionLoading?: boolean;
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
  onSetDuration,
  isActionLoading = false
}) => {
  const [showMusic, setShowMusic] = useState(false);
  const { todos, activeTodoId } = useStore();
  const activeTodo = todos.find((t) => t.id === activeTodoId && !t.completed);

  const progress = plannedDuration > 0 ? (elapsed / (plannedDuration * 60)) * 100 : 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
        return;
      }

      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "BUTTON" ||
        target.tagName === "SELECT" ||
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
          <div className="glass-card p-12 text-center flex flex-col items-center justify-center relative overflow-hidden">
            {/* Pulsing glow line top */}
            {activeTodo && (
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent animate-pulse" />
            )}

            {/* Active Todo Banner */}
            {activeTodo && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 px-4 py-2 bg-accent/10 border border-accent/20 rounded-xl inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.05)] animate-pulse"
              >
                <Target size={12} className="animate-spin-slow" /> Focusing on: {activeTodo.text}
              </motion.div>
            )}

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
                  disabled={isActionLoading}
                  aria-label="Start study session"
                  className="btn-primary px-12 py-4 rounded-2xl flex items-center gap-3 shadow-[0_0_30px_rgba(123,97,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isActionLoading ? (
                    <>
                      <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      INITIALIZING MISSION...
                    </>
                  ) : (
                    <>
                      <Play size={20} fill="currentColor" /> INITIALIZE MISSION
                    </>
                  )}
                </button>
              ) : (
                <>
                  {status === "running" ? (
                    <button 
                      onClick={onPause} 
                      disabled={isActionLoading}
                      aria-label="Pause session"
                      className="nav-btn p-6 rounded-2xl bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Pause size={24} fill="currentColor" />
                    </button>
                  ) : (
                    <button 
                      onClick={onResume} 
                      disabled={isActionLoading}
                      aria-label="Resume session"
                      className="nav-btn p-6 rounded-2xl bg-accent text-black shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Play size={24} fill="currentColor" />
                    </button>
                  )}
                  <button 
                    onClick={() => onEnd()} 
                    disabled={isActionLoading}
                    aria-label="End session"
                    className="btn-danger px-12 py-4 rounded-2xl flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isActionLoading ? (
                      <>
                        <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        TERMINATING MISSION...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={20} /> TERMINATE MISSION
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Synced To-Do Queue */}
        <TodoWidget />

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
            &quot;Neural focus is a limited resource. Do not attempt missions exceeding 90 minutes without a cooling phase.&quot;
          </p>
        </div>
      </div>
    </div>
  );
};

export default TimerView;
