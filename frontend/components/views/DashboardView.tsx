import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  Target, 
  Activity, 
  Flame, 
  Brain, 
  Plus, 
  Shield, 
  Users, 
  Coffee, 
  Calendar, 
  X, 
  Sparkle, 
  Clock,
  Lock,
  Unlock,
  CreditCard,
  RefreshCw
} from "lucide-react";
import { Dashboard, User } from "../../lib/types";
import PetPanel from "../ui/PetPanel";
import ChallengeList from "../ui/ChallengeList";
import { BadgeGallery } from "../ui/BadgeGallery";
import { StudyGroupPanel } from "../ui/StudyGroupPanel";
import TodoWidget from "../ui/TodoWidget";
import { useStore } from "../../lib/store";
import { upgradeToPremium } from "../../lib/api";
import toast from "react-hot-toast";

interface DashboardViewProps {
  user: User;
  dashboard: Dashboard | null;
  goalDaily: number;
}

const DashboardView: React.FC<DashboardViewProps> = ({ user, dashboard, goalDaily }) => {
  const isLoading = !dashboard;
  const [activeTab, setActiveTab] = useState<"overview" | "history">("overview");
  const [isClosed, setIsClosed] = useState(false);
  const { setUser, setDashboard } = useStore();

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardExpiry || !cardCvc) {
      toast.error("Please fill in all neural transaction fields.");
      return;
    }
    try {
      setUpgrading(true);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const res = await upgradeToPremium(user._id);
      setUser(res.user);
      setDashboard(res.dashboard);
      toast.success("Discipline Pipeline Upgraded to Premium. Neural network fully unlocked.");
      setCheckoutOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Upgrade transaction failed.");
    } finally {
      setUpgrading(false);
    }
  };

  // Sync collapsed state to localStorage
  useEffect(() => {
    const closedPref = localStorage.getItem("grindlock-dashboard-collapsed");
    if (closedPref === "true") {
      setIsClosed(true);
    }
  }, []);

  const handleSetClosed = (val: boolean) => {
    setIsClosed(val);
    localStorage.setItem("grindlock-dashboard-collapsed", String(val));
  };

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
          </div>
        </div>
      </div>
    );
  }

  // Collapsed / Minimal Dashboard view
  if (isClosed) {
    return (
      <div className="flex items-center justify-center py-20 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => handleSetClosed(false)}
          className="glass-card p-12 text-center border-accent/20 cursor-pointer max-w-md w-full relative overflow-hidden group shadow-[0_0_50px_rgba(123,97,255,0.05)] bg-[#050507]"
        >
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent animate-pulse" />
          <div className="p-4 bg-accent/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 text-accent group-hover:scale-110 transition-transform">
            <Activity size={28} className="animate-pulse" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-accent mb-2">Neural Link Collapsed</h3>
          <p className="text-[10px] text-muted uppercase tracking-widest leading-relaxed mb-6 font-bold">
            Dashboard interface offline. Tap capsule to re-engage synchronization protocol.
          </p>
          <div className="inline-flex items-center gap-2 text-[10px] font-black text-white/50 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-xl border border-white/5 group-hover:text-white group-hover:border-accent/30 group-hover:bg-accent/5 transition-all">
            <Sparkle size={10} className="animate-spin" /> Establish Neural Link
          </div>
        </motion.div>
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
            transition={{ delay: i * 0.05 }}
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

      {/* Tab Selector & Collapse Action */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all relative ${
              activeTab === "overview"
                ? "border-accent text-white"
                : "border-transparent text-muted hover:text-white"
            }`}
          >
            Overview
            {activeTab === "overview" && (
              <motion.div layoutId="activeTabGlow" className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all relative ${
              activeTab === "history"
                ? "border-accent text-white"
                : "border-transparent text-muted hover:text-white"
            }`}
          >
            Study History
            {activeTab === "history" && (
              <motion.div layoutId="activeTabGlow" className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]" />
            )}
          </button>
        </div>
        <button
          onClick={() => handleSetClosed(true)}
          className="p-2 bg-white/5 border border-white/5 hover:bg-white/10 text-muted hover:text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 min-h-[44px] min-w-[120px] justify-center"
          title="Collapse Dashboard"
        >
          <X size={12} /> Collapse Link
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "overview" ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 xl:grid-cols-3 gap-12"
          >
            {/* Left/Center Column: Challenges & Tasks */}
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

              {/* Tasks & Badges Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <TodoWidget />
                 <BadgeGallery achievements={user.achievements || []} />
              </div>

              <section aria-labelledby="challenges-heading">
                <h2 id="challenges-heading" className="sr-only">Active Challenges</h2>
                <ChallengeList challenges={dashboard?.challenges || []} />
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <StudyGroupPanel groups={dashboard?.groups || []} />
                 {/* AI Coach Suggestion Card */}
                 <div className="glass-card p-8 bg-gradient-to-r from-accent/10 via-transparent to-transparent border-accent/20 flex flex-col justify-center relative overflow-hidden">
                   {dashboard?.premiumHooks?.lockedAiInsights && (
                     <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-10 flex flex-col items-center justify-center p-6 text-center">
                       <Lock className="text-accent mb-3 animate-pulse" size={24} />
                       <p className="text-xs font-black uppercase tracking-widest text-white">Neural Advisor Locked</p>
                       <p className="text-[9px] text-muted uppercase tracking-wider mt-1 mb-4 leading-relaxed">Upgrade to Premium to unlock AI study strategy insights.</p>
                       <button
                         onClick={() => setCheckoutOpen(true)}
                         className="px-4 py-2 bg-accent text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-accent/80 transition-all"
                       >
                         Unlock Insights
                       </button>
                     </div>
                   )}
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
                             transition={{ delay: i * 0.05 }}
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
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-12 relative overflow-hidden"
          >
            {dashboard?.premiumHooks?.lockedAnalytics ? (
              <div className="glass-card p-16 text-center border-accent/20 max-w-xl mx-auto flex flex-col items-center justify-center space-y-6">
                <Lock className="text-accent animate-pulse" size={40} />
                <h3 className="text-lg font-black uppercase tracking-widest text-white">Neural Analytics Locked</h3>
                <p className="text-xs text-muted uppercase tracking-wider max-w-md leading-relaxed">
                  Upgrade to Premium to unlock detailed study maps, historical heatmap logs, compliance calculations, and weekly wasted hour statistics.
                </p>
                <button
                  onClick={() => setCheckoutOpen(true)}
                  className="btn-primary px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(var(--color-accent),0.3)] hover:scale-105 transition-all"
                >
                  Unlock Neural Analytics
                </button>
              </div>
            ) : (
              <>
                {/* History Stats Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="glass-card p-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted">Total Hours</span>
                <p className="display-sm text-3xl font-black text-accent mt-2">{dashboard?.totals?.totalStudyHours || 0} hrs</p>
              </div>
              <div className="glass-card p-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted">Completed Days</span>
                <p className="display-sm text-3xl font-black text-success mt-2">{dashboard?.totals?.totalCompletedDays || 0} days</p>
              </div>
              <div className="glass-card p-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted">Missed Cycles</span>
                <p className="display-sm text-3xl font-black text-danger mt-2">{dashboard?.totals?.totalMissedDays || 0} days</p>
              </div>
              <div className="glass-card p-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted">Compliance Rate</span>
                <p className="display-sm text-3xl font-black text-warning mt-2">{dashboard?.complianceRate || 0}%</p>
              </div>
            </div>

            {/* GitHub-style Contribution Heatmap */}
            <section className="glass-card p-8 border-white/5">
              <div className="flex items-center gap-3 mb-6">
                <Calendar className="text-accent" size={18} />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white/80">Neural Study Map</h3>
                  <p className="text-[9px] text-muted uppercase tracking-widest mt-0.5">60-Day Contribution Heatmap</p>
                </div>
              </div>
              
              <div className="grid grid-cols-10 sm:grid-cols-12 md:grid-cols-15 lg:grid-cols-20 gap-2 p-4 bg-black/20 rounded-2xl border border-white/5 justify-items-center">
                {dashboard?.history?.map((day, i) => (
                  <div 
                    key={i} 
                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-110 hover:brightness-125 relative group cursor-pointer ${
                      day.completionPercent >= 100
                        ? "heatmap-complete"
                        : day.completionPercent >= 75
                        ? "heatmap-high"
                        : day.completionPercent >= 50
                        ? "heatmap-medium"
                        : day.completionPercent > 0
                        ? "heatmap-low"
                        : "heatmap-empty"
                    }`}
                  >
                    {/* Tooltip popup on hover */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 rounded-xl bg-black border border-white/10 text-[9px] font-black uppercase tracking-widest text-white whitespace-nowrap shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                      <p className="font-black text-white">{day.date}</p>
                      <p className="text-accent mt-0.5">{day.studiedMinutes}m / {day.targetMinutes}m goal</p>
                      <p className={`mt-0.5 ${day.completed ? "text-success" : "text-warning"}`}>
                        {day.completionPercent}% {day.completed ? "Synchronized" : "Pending"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Daily History Details List */}
            <section className="glass-card p-8 border-white/5">
              <div className="flex items-center gap-3 mb-6">
                <Clock className="text-success" size={18} />
                <h3 className="text-xs font-black uppercase tracking-widest text-white/80">Temporal Log Entries</h3>
              </div>
              <div className="space-y-3 overflow-y-auto max-h-[350px] pr-2 scrollbar-thin">
                {dashboard?.history?.filter(h => h.studiedMinutes > 0).map((day, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl transition-all">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">
                        {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-[9px] text-muted uppercase tracking-widest mt-0.5">Target: {day.targetMinutes}m</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-accent">{day.studiedMinutes} min studied</p>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${day.completed ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}>
                        {day.completionPercent}% {day.completed ? "Synchronized" : "Unfulfilled"}
                      </span>
                    </div>
                  </div>
                ))}
                {(!dashboard?.history || dashboard.history.filter(h => h.studiedMinutes > 0).length === 0) && (
                  <p className="text-[10px] text-center text-muted py-8 italic uppercase tracking-widest font-black">No study records synchronized.</p>
                )}
              </div>
            </section>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Checkout Payment Simulation Modal */}
      <AnimatePresence>
        {checkoutOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-card max-w-md w-full p-8 border border-accent/40 relative overflow-hidden bg-[#0a0a0c]"
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-accent to-success" />
              <button 
                onClick={() => setCheckoutOpen(false)}
                className="absolute top-4 right-4 text-muted hover:text-white transition-all"
                aria-label="Close Checkout"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-accent/20 rounded-xl text-accent border border-accent/30">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Neural Premium Upgrade</h3>
                  <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">Initialize secure transaction pipeline</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2 mb-6">
                <div className="flex justify-between text-xs">
                  <span className="text-muted font-bold uppercase tracking-wider">Premium Access License</span>
                  <span className="text-white font-black">$9.99 / Lifetime</span>
                </div>
                <div className="flex justify-between text-[9px] text-muted uppercase tracking-widest border-t border-white/5 pt-2">
                  <span>Taxes &amp; Gas Fees</span>
                  <span>$0.00</span>
                </div>
              </div>

              <form onSubmit={handleUpgrade} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted">Card Number</label>
                  <input 
                    type="text"
                    placeholder="4111 2222 3333 4444"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    maxLength={19}
                    className="w-full bg-black/60 border border-white/10 text-xs px-3 py-2 rounded-lg text-white"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted">Expiration Date</label>
                    <input 
                      type="text"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      maxLength={5}
                      className="w-full bg-black/60 border border-white/10 text-xs px-3 py-2 rounded-lg text-white"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted">Security Code (CVC)</label>
                    <input 
                      type="password"
                      placeholder="•••"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      maxLength={4}
                      className="w-full bg-black/60 border border-white/10 text-xs px-3 py-2 rounded-lg text-white"
                      required
                    />
                  </div>
                </div>

                <div className="text-[9px] text-muted uppercase tracking-wide leading-relaxed mt-2 text-center">
                  This transaction is fully simulated. No real currency will be charged.
                </div>

                <button
                  type="submit"
                  disabled={upgrading}
                  className="btn-primary w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest mt-6 flex items-center justify-center gap-2"
                >
                  {upgrading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      PROCESSING TRANSACTION...
                    </>
                  ) : (
                    <>
                      <Unlock size={14} />
                      CONFIRM UPGRADE
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardView;
