import React from 'react';
import { Award, Shield, Zap, Target, Star, Flame } from 'lucide-react';

interface Achievement {
  achievementId: {
    _id: string;
    title: string;
    description: string;
    icon: string;
    category: string;
  };
  earnedAt: string;
}

interface BadgeGalleryProps {
  achievements: Achievement[];
}

const iconMap: Record<string, any> = {
   Award, Shield, Zap, Target, Star, Flame
};

export const BadgeGallery: React.FC<BadgeGalleryProps> = ({ achievements }) => {
  const [showAll, setShowAll] = React.useState(false);
  const displayedAchievements = showAll ? achievements : achievements.slice(0, 6);

  return (
    <div className="p-6 glass rounded-2xl border border-white/5 h-full overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-accent/20 rounded-lg">
          <Award className="text-accent" size={20} />
        </div>
        <h2 className="text-xl font-black uppercase tracking-tighter">Neural Commendations</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {displayedAchievements.map((ach) => {
          const Icon = iconMap[ach.achievementId.icon] || Award;
          return (
            <div 
              key={ach.achievementId._id}
              className="group relative flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/5 hover:border-accent/50 transition-all cursor-default"
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-accent/10 text-accent group-hover:scale-110 transition-transform mb-3 shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)]">
                <Icon size={24} />
              </div>
              <p className="text-[10px] font-bold text-center uppercase tracking-widest leading-tight">{ach.achievementId.title}</p>
              
              {/* Tooltip */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full w-40 p-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <p className="text-[10px] text-accent font-black uppercase mb-1">{ach.achievementId.category}</p>
                <p className="text-[11px] text-white/70 leading-snug">{ach.achievementId.description}</p>
                <p className="text-[9px] text-white/40 mt-1 uppercase">Earned: {new Date(ach.earnedAt).toLocaleDateString()}</p>
              </div>
            </div>
          );
        })}
        {achievements.length === 0 && (
          <div className="col-span-full py-12 text-center opacity-30">
            <p className="text-xs uppercase tracking-widest">No commendations earned yet.</p>
          </div>
        )}
        {achievements.length > 6 && (
          <div className="col-span-full text-center pt-4">
            <button 
              onClick={() => setShowAll(!showAll)} 
              className="text-[10px] font-black uppercase tracking-widest text-accent hover:underline hover:text-white transition-colors py-2 px-4 rounded-lg bg-white/5 border border-white/5"
            >
              {showAll ? "Show Less Commendations" : `Show All Commendations (${achievements.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
