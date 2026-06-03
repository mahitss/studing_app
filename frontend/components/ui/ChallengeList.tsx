import React from 'react';
import { Target, Trophy, CheckCircle2, Circle } from 'lucide-react';
import { motion } from 'framer-motion';

interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  value: number;
  completed: boolean;
  rewardXp: number;
  rewardBadge?: string;
}

interface ChallengeListProps {
  challenges: Challenge[];
}

export default function ChallengeList({ challenges }: ChallengeListProps) {
  const [showAll, setShowAll] = React.useState(false);
  const displayedChallenges = showAll ? challenges : challenges.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted flex items-center gap-2">
          <Target size={14} className="text-accent" /> Active Directives
        </h3>
        <span className="text-[10px] font-bold text-accent uppercase tracking-widest">
          {challenges.filter(c => c.completed).length}/{challenges.length} Done
        </span>
      </div>

      {challenges.length === 0 ? (
        <div className="glass-card p-8 text-center border-dashed border-white/10">
          <Trophy size={24} className="mx-auto mb-4 text-muted opacity-20" />
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest">No active challenges. Protocol: Initiate Study.</p>
        </div>
      ) : (
        <>
          {displayedChallenges.map((challenge, idx) => {
            const progress = Math.min(100, (challenge.value / challenge.target) * 100);
            return (
              <motion.div 
                key={challenge.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={`glass-card p-5 border-l-4 transition-all ${challenge.completed ? 'border-l-success bg-success/5' : 'border-l-accent'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className={`text-[11px] font-black uppercase tracking-widest mb-1 ${challenge.completed ? 'text-success' : 'text-white'}`}>
                      {challenge.title}
                    </h4>
                    <p className="text-[9px] text-muted font-bold leading-relaxed">{challenge.description}</p>
                  </div>
                  {challenge.completed ? (
                    <CheckCircle2 size={16} className="text-success" />
                  ) : (
                    <Circle size={16} className="text-white/10" />
                  )}
                </div>

                {!challenge.completed && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-muted">
                      <span>{challenge.value} / {challenge.target}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-accent shadow-[0_0_10px_rgba(123,97,255,0.3)]" 
                      />
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[8px] font-black uppercase tracking-widest text-accent bg-accent/10 px-2 py-0.5 rounded">
                    +{challenge.rewardXp} XP
                  </span>
                  {challenge.rewardBadge && (
                    <span className="text-[8px] font-black uppercase tracking-widest text-muted italic">
                      Unlock: {challenge.rewardBadge}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
          
          {challenges.length > 5 && (
            <div className="text-center pt-2">
              <button 
                onClick={() => setShowAll(!showAll)} 
                className="text-[10px] font-black uppercase tracking-widest text-accent hover:underline hover:text-white transition-colors py-2 px-4 rounded-lg bg-white/5 border border-white/5"
              >
                {showAll ? "Show Less Directives" : `Show All Directives (${challenges.length})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
