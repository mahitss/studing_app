import React from 'react';
import { Heart, Star, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface PetProps {
  pet?: {
    name: string;
    type: string;
    level: number;
    happiness: number;
  };
  xp: number;
}

export default function PetPanel({ pet, xp }: PetProps) {
  if (!pet) {
    return (
      <div className="glass-card p-6 flex items-center justify-center h-full text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted">No Companion Assigned</p>
      </div>
    );
  }
  const nextLevelXp = pet.level * 500;
  const progress = (xp % 500) / 500 * 100;

  return (
    <div className="glass-card p-6 relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Zap size={120} className="text-accent" />
      </div>

      <div className="flex items-start gap-6 relative z-10">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center border border-accent/20 shadow-inner">
            <motion.div
              animate={{ 
                y: [0, -5, 0],
                rotate: [0, 2, -2, 0]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 3,
                ease: "easeInOut"
              }}
              className="text-4xl"
            >
              🤖
            </motion.div>
          </div>
          <div className="absolute -bottom-2 -right-2 bg-accent text-black text-[8px] font-black px-2 py-0.5 rounded-full border-2 border-black">
            LVL {pet.level}
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-white">{pet.name}</h3>
            <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Active Partner</span>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[8px] font-black uppercase tracking-widest mb-1 text-muted">
                <span>Happiness</span>
                <span className={pet.happiness > 70 ? "text-success" : "text-warning"}>{pet.happiness}%</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${pet.happiness}%` }}
                  className="h-full bg-success shadow-[0_0_10px_rgba(0,212,255,0.3)]" 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[8px] font-black uppercase tracking-widest mb-1 text-muted">
                <span>Evolution Progress</span>
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
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity cursor-help" title="Protection Active">
            <Shield size={12} className="text-accent" />
            <span className="text-[8px] font-bold uppercase tracking-widest">Shielded</span>
          </div>
          <div className="flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity cursor-help" title="Happiness Multiplier">
            <Heart size={12} className="text-danger" />
            <span className="text-[8px] font-bold uppercase tracking-widest">Loved</span>
          </div>
        </div>
        <button className="text-[8px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 px-3 py-1 rounded-lg transition-all">Interact</button>
      </div>
    </div>
  );
}
