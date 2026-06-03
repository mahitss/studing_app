import React from "react";
import { LogOut, LayoutDashboard, Timer, BarChart3, Flame, Swords, Settings } from "lucide-react";
import { User, Dashboard } from "../../lib/types";
import { Screen } from "../../lib/store";

interface SidebarProps {
  user: User | null;
  dashboard: Dashboard | null;
  activeScreen: Screen;
  onScreenChange: (screen: Screen) => void;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, dashboard, activeScreen, onScreenChange, onLogout, isOpen = false, onClose }) => {
  const navItems: { id: Screen; label: string; icon: any; hotkey: string }[] = [
    { id: "dashboard", label: "Neural Core", icon: LayoutDashboard, hotkey: "Alt+D" },
    { id: "timer", label: "Neural Sync", icon: Timer, hotkey: "Alt+T" },
    { id: "analytics", label: "Neural Map", icon: BarChart3, hotkey: "Alt+A" },
    { id: "streak", label: "Neural Persistence", icon: Flame, hotkey: "Alt+M" },
    { id: "colosseum", label: "Tactical Center", icon: Swords, hotkey: "Alt+C" },
    { id: "settings", label: "Neural Config", icon: Settings, hotkey: "Alt+S" },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      <aside className={`w-80 h-screen fixed left-0 top-0 glass-card border-r border-white/5 flex flex-col p-8 z-[110] transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-3 mb-16">
        <img src="/images/logo.png" alt="GrindLock Logo" className="w-10 h-10 rounded-xl object-contain" />
        <h1 className="display-sm text-xl tracking-tighter uppercase font-black">GrindLock<span className="text-accent">.</span></h1>
      </div>


      <nav className="space-y-2 flex-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onScreenChange(item.id)}
            aria-label={`${item.label} (${item.hotkey})`}
            title={`${item.label} (${item.hotkey})`}
            className={`w-full flex items-center justify-between px-6 py-4 rounded-xl transition-all duration-300 ${
              activeScreen === item.id 
                ? "bg-accent/10 text-accent font-bold" 
                : "text-muted hover:bg-white/5 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-4">
              <item.icon size={18} strokeWidth={activeScreen === item.id ? 2.5 : 2} />
              <span className="text-[10px] uppercase tracking-[0.2em]">{item.label}</span>
            </div>
            <span className="text-[8px] opacity-20 font-black tracking-widest group-hover:opacity-100">{item.hotkey}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-8 border-t border-white/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-accent flex items-center justify-center font-bold text-white uppercase">
            {user?.name ? user.name.charAt(0) : 'G'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold truncate">{user?.name}</p>
            <p className="text-[10px] text-muted uppercase tracking-widest">Lvl {dashboard?.gamification?.level || 1}</p>
          </div>
        </div>
        <button 
          onClick={onLogout} 
          aria-label="Logout and eject system"
          className="nav-btn w-full opacity-50 hover:opacity-100 flex items-center gap-3"
        >
          <LogOut size={16} />
          <span className="text-[10px] uppercase tracking-widest">Eject</span>
        </button>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
