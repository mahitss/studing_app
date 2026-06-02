import React from "react";
import { motion } from "framer-motion";
import { Dashboard } from "../../lib/types";

interface StreakViewProps {
  dashboard: Dashboard | null;
}

const StreakView: React.FC<StreakViewProps> = ({ dashboard }) => {
  if (!dashboard) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center min-h-[60vh] space-y-8">
        <div className="w-32 h-32 skeleton rounded-full" />
        <div className="w-40 h-16 skeleton rounded-2xl" />
        <div className="w-56 h-4 skeleton" />
        <div className="flex gap-20 mt-8">
          <div className="space-y-3">
            <div className="w-24 h-3 skeleton" />
            <div className="w-16 h-8 skeleton rounded-xl" />
          </div>
          <div className="space-y-3">
            <div className="w-24 h-3 skeleton" />
            <div className="w-16 h-8 skeleton rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center p-20 text-center min-h-[60vh]"
    >
      <motion.div 
        role="img" 
        aria-label="Current mission streak"
        className="text-8xl mb-8 filter drop-shadow-[0_0_40px_rgba(255,80,0,0.5)] animate-pulse"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        🔥
      </motion.div>
      <motion.h2 
        className="display-lg text-8xl mb-4 font-black"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {dashboard?.streak?.current || 0}
      </motion.h2>
      <motion.p 
        className="text-xs font-black tracking-[0.5em] uppercase text-accent mb-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        Consecutive Mission Days
      </motion.p>
      
      <div className="flex gap-20">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-3">Neural Record</p>
          <p className="text-4xl font-black">{dashboard?.streak?.longest || 0}d</p>
        </motion.div>
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-3">Sync Consistency</p>
          <p className="text-4xl font-black">{dashboard?.consistencyScore7d || 0}%</p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default StreakView;

