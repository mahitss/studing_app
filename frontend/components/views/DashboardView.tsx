import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, Target, Activity, Flame, MessageSquare, Brain, Plus } from "lucide-react";
import { Dashboard, User } from "../../lib/types";
import PetPanel from "../ui/PetPanel";
import ChallengeList from "../ui/ChallengeList";
import { BadgeGallery } from "../ui/BadgeGallery";
import { StudyGroupPanel } from "../ui/StudyGroupPanel";
import { Shield, Users, Award, Coffee } from "lucide-react";

interface DashboardViewProps {
  user: User;
  dashboard: Dashboard | null;
  goalDaily: number;
}

const DashboardView: React.FC<DashboardViewProps> = ({ user, dashboard, goalDaily }) => {
  const isLoading = !dashboard;
  const stats = [
    { label: "Neural XP", value: dashboard?.gamification?.xp || user.xp || 0, icon: <TrendingUp size={20} />, color: "text-accent" },
    { label: "Neural Level", value: dashboard?.gamification?.level || user.level || 1, icon: <Activity size={20} />, color: "text-success" },
    { label: "Mission Streak", value: `${dashboard?.streak?.current || user.streak?.current || 0} Days`, icon: <Flame size={20} />, color: "text-warning" },
    { label: "Goal Progress", value: `${dashboard?.todayGoal?.completionPercent || 0}%`, icon: <Target size={20} />, color: "text-danger" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-12 animate-pulse">
        {/* Stats bar skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-6 border-white/5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-white/10" />
                <div className="h-2 w-24 bg-white/10 rounded" />
              </div>
              <div className="h-8 w-16 bg-white/10 rounded" />
            </div>
          ))}
        </div>
        
        {/* Main layout skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
          <div className="xl:col-span-2 space-y-12">
            <div className="glass-card p-8 border-white/5 space-y-6">
              <div className="h-4 w-48 bg-white/10 rounded" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                    <div className="h-3 w-20 bg-white/10 rounded" />
                    <div className="h-1.5 w-full bg-black/40 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card p-8 border-white/5 space-y-4">
              <div className="h-4 w-32 bg-white/10 rounded" />
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-12 w-full bg-white/5 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-12">
            <div className="glass-card p-8 border-white/5 space-y-4">
              <div className="h-4 w-32 bg-white/10 rounded" />
              <div className="w-full aspect-square bg-white/5 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const studiedMinutes = dashboard?.todayGoal?.studiedMinutes || 0;
  const m1Target = Math.round(goalDaily / 6);
  const m2Target = Math.round(goalDaily / 2);
  const m3Target = goalDaily;

  const milestones = [
    {
      label: "Neural Setup",
      stageTarget: m1Target,
      stageCurrent: Math.min(studiedMinutes, m1Target),
      displayTarget: m1Target,
      displayCurrent: Math.min(studiedMinutes, m1Target)
    },
    {
      label: "Core Execution",
      stageTarget: Math.max(1, m2Target - m1Target),
      stageCurrent: Math.max(0, Math.min(studiedMinutes, m2Target) - m1Target),
      displayTarget: m2Target,
      displayCurrent: Math.min(studiedMinutes, m2Target)
    },
    {
      label: "Final Validation",
      stageTarget: Math.max(1, m3Target - m2Target),
      stageCurrent: Math.max(0, studiedMinutes - m2Target),
      displayTarget: m3Target,
      displayCurrent: studiedMinutes
    }
  ];

  return (
    <div className="space-y-12">
      {/* Top Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 relative overflow-hidden"
          >
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}>{stat.icon}</div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted">{stat.label}</span>
            </div>
            <p className="display-sm text-3xl font-black relative z-10">{stat.value}</p>
            <div className="absolute -right-2 -bottom-2 opacity-[0.03] rotate-12">
               {stat.icon}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        {/* Left/Center Column: Challenges & Analytics */}
        <div className="xl:col-span-2 space-y-12">
          {/* Micro-Challenges (Goal Decomposition) */}
          <section className="glass-card p-8 border-white/5">
            <div className="flex items-center gap-3 mb-8">
              <Shield className="text-accent" size={20} />
              <h2 className="text-xs font-black uppercase tracking-widest text-white/50">Mission Decomposition</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {milestones.map((m, idx) => (
                <div key={idx} className={`p-4 rounded-xl border transition-all ${m.displayCurrent >= m.displayTarget ? 'bg-success/10 border-success/30' : 'bg-white/5 border-white/10'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">{m.label}</span>
                    <span className={`text-[10px] font-black ${m.displayCurrent >= m.displayTarget ? 'text-success' : 'text-white/40'}`}>{m.displayTarget}M</span>
                  </div>
                  <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${m.displayCurrent >= m.displayTarget ? 'bg-success shadow-[0_0_10px_rgba(var(--success-rgb),0.5)]' : 'bg-white/20'}`}
                      style={{ width: `${Math.min(100, (m.stageCurrent / m.stageTarget) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="challenges-heading">
            <h2 id="challenges-heading" className="sr-only">Active Challenges</h2>
            <ChallengeList challenges={dashboard?.challenges || []} />
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
             <BadgeGallery achievements={user.achievements || []} />
             <StudyGroupPanel groups={dashboard?.groups || []} />
          </div>

          {/* AI Coach Suggestion Card */}
          <div className="glass-card p-8 bg-gradient-to-r from-accent/10 via-transparent to-transparent border-accent/20">
            <div className="flex items-start gap-6">
              <div className="p-4 bg-accent/20 rounded-2xl">
                <Brain size={32} className="text-accent" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-accent">Neural Advisor Feedback</h3>
                  {dashboard?.breakSuggestions && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                      <Coffee size={12} className="text-warning" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-warning">{dashboard.breakSuggestions}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {(dashboard?.aiCoach || []).map((msg: string, i: number) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="flex items-center gap-3 text-xs font-bold text-white/80"
                    >
                      <div className="w-1 h-1 rounded-full bg-accent" />
                      {msg}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pet & Mentorship */}
        <div className="space-y-12">
          <section aria-labelledby="pet-heading">
            <h2 id="pet-heading" className="text-xs font-black uppercase tracking-widest text-muted mb-6 flex items-center gap-2">
              <Activity size={14} className="text-success" /> Neural Companion
            </h2>
            <PetPanel pet={dashboard?.user?.pet || user.pet} xp={dashboard?.gamification?.xp || user.xp || 0} />
          </section>

          {/* AI Mentorship Matching */}
          <section className="glass-card p-8 border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <Users className="text-primary" size={18} />
              <h3 className="text-xs font-black uppercase tracking-widest text-white/50">Neural Mentors</h3>
            </div>
            <div className="space-y-4">
              {(dashboard?.mentors || []).map((mentor, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-black border border-primary/30">
                      {mentor.name[0]}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">{mentor.name}</p>
                      <p className="text-[9px] text-white/40 uppercase">Level {mentor.level} • {mentor.college}</p>
                    </div>
                  </div>
                  <button className="p-1.5 hover:bg-white/10 rounded-lg text-primary transition-all">
                    <Plus size={14} />
                  </button>
                </div>
              ))}
              {(!dashboard?.mentors || dashboard.mentors.length === 0) && (
                <p className="text-[10px] text-center italic text-white/20">Finding optimal matches...</p>
              )}
            </div>
          </section>

          <div className="glass-card p-8 text-center bg-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Flame size={40} className="text-warning" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-muted mb-6">Neural Consistency (7D)</h3>
            <div className="flex justify-center gap-3">
              {Array.from({ length: 7 }).map((_, i) => {
                const isCompleted = i < (dashboard?.streak?.current || 0);
                return (
                  <div 
                    key={i} 
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black transition-all duration-500 ${
                      isCompleted 
                        ? 'bg-warning text-black shadow-[0_0_15px_rgba(245,158,11,0.3)] scale-110' 
                        : 'bg-white/5 text-muted border border-white/5'
                    }`}
                    title={isCompleted ? "Protocol Fulfilled" : "Awaiting Synchronization"}
                  >
                    {isCompleted ? <Shield size={14} fill="currentColor" /> : i + 1}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-6">
              {dashboard?.streak?.current && dashboard.streak.current >= 7 
                ? "Neural Link Stabilized" 
                : `${7 - (dashboard?.streak?.current || 0)} Cycles to Stabilization`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
