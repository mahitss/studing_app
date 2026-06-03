import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Coffee, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PomodoroTimerProps {
  onComplete: () => void;
}

export default function PomodoroTimer({ onComplete }: PomodoroTimerProps) {
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      const audio = new Audio("https://cdn.pixabay.com/download/audio/2022/03/10/audio_c0c3a26a57.mp3?filename=level-up-109254.mp3");
      audio.play().catch(err => console.warn("Audio autoplay blocked or failed:", err));
      
      if (mode === 'work') {
        onCompleteRef.current();
        setMode('break');
        setTimeLeft(5 * 60);
      } else {
        setMode('work');
        setTimeLeft(25 * 60);
      }
      setIsActive(false);
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'work' ? 25 * 60 : 5 * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-card p-8 text-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
        <motion.div 
          className={`h-full ${mode === 'work' ? 'bg-accent' : 'bg-success'}`}
          initial={{ width: "100%" }}
          animate={{ width: `${(timeLeft / (mode === 'work' ? 25 * 60 : 5 * 60)) * 100}%` }}
          transition={{ duration: 1, ease: "linear" }}
        />
      </div>

      <div className="flex justify-center gap-4 mb-6">
        <button 
          onClick={() => { setMode('work'); setTimeLeft(25 * 60); setIsActive(false); }}
          className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'work' ? 'bg-accent text-black shadow-[0_0_15px_rgba(123,97,255,0.4)]' : 'bg-white/5 text-muted'}`}
        >
          Work Phase
        </button>
        <button 
          onClick={() => { setMode('break'); setTimeLeft(5 * 60); setIsActive(false); }}
          className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'break' ? 'bg-success text-black shadow-[0_0_15px_rgba(0,212,255,0.4)]' : 'bg-white/5 text-muted'}`}
        >
          Bio Break
        </button>
      </div>

      <motion.div 
        key={mode}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="display-xl text-8xl font-black mb-8 tracking-tighter"
      >
        {formatTime(timeLeft)}
      </motion.div>

      <div className="flex justify-center gap-6">
        <button onClick={toggleTimer} className={`p-6 rounded-2xl transition-all ${isActive ? 'bg-white/10 text-white' : 'bg-accent text-black shadow-lg shadow-accent/20'}`}>
          {isActive ? <Pause size={32} /> : <Play size={32} fill="currentColor" />}
        </button>
        <button onClick={resetTimer} className="p-6 rounded-2xl bg-white/5 text-muted hover:bg-white/10 transition-all">
          <RotateCcw size={32} />
        </button>
      </div>

      <div className="mt-8 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-muted">
        {mode === 'work' ? <Zap size={14} className="text-accent" /> : <Coffee size={14} className="text-success" />}
        <span>{mode === 'work' ? "System in High-Focus Mode" : "Neural Cooling in Progress"}</span>
      </div>
    </div>
  );
}
