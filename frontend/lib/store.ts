import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Dashboard, StudySession, LiveFriend } from './types';

export type Screen = "dashboard" | "timer" | "analytics" | "streak" | "colosseum" | "settings";

interface AppStore {
  // Authentication & User
  user: User | null;
  setUser: (user: User | null) => void;
  
  // UI State
  screen: Screen;
  setScreen: (screen: Screen) => void;
  isInitializing: boolean;
  setIsInitializing: (val: boolean) => void;
  isActionLoading: boolean;
  setIsActionLoading: (val: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  
  // Mission Data
  dashboard: Dashboard | null;
  setDashboard: (dashboard: Dashboard | null) => void;
  sessions: StudySession[];
  setSessions: (sessions: StudySession[]) => void;
  activeSession: StudySession | null;
  setActiveSession: (val: StudySession | null | ((prev: StudySession | null) => StudySession | null)) => void;
  
  // Real-time Data
  liveFriends: LiveFriend[];
  setLiveFriends: (friends: LiveFriend[]) => void;
  liveMessage: string;
  setLiveMessage: (msg: string) => void;
  rooms: any[];
  setRooms: (rooms: any[]) => void;
  currentRoom: any | null;
  setCurrentRoom: (room: any | null) => void;
  duels: any[];
  setDuels: (duels: any[]) => void;
  activeDuel: any | null;
  setActiveDuel: (duel: any | null) => void;

  // Session Config
  subject: string;
  setSubject: (s: string) => void;
  studyMode: "pomodoro" | "deep" | "custom";
  setStudyMode: (m: "pomodoro" | "deep" | "custom") => void;
  plannedDuration: number;
  setPlannedDuration: (d: number) => void;
  riskMode: boolean;
  setRiskMode: (r: boolean) => void;
  
  // Misc
  lastSyncAt: number;
  setLastSyncAt: (t: number) => void;
}

export const useStore = create<AppStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      
      screen: "dashboard",
      setScreen: (screen) => set({ screen }),
      isInitializing: true,
      setIsInitializing: (isInitializing) => set({ isInitializing }),
      isActionLoading: false,
      setIsActionLoading: (isActionLoading) => set({ isActionLoading }),
      error: null,
      setError: (error) => set({ error }),
      
      dashboard: null,
      setDashboard: (dashboard) => set({ dashboard }),
      sessions: [],
      setSessions: (sessions) => set({ sessions }),
      activeSession: null,
      setActiveSession: (val) => set((state) => ({ 
        activeSession: typeof val === 'function' ? val(state.activeSession) : val 
      })),
      
      liveFriends: [],
      setLiveFriends: (liveFriends) => set({ liveFriends }),
      liveMessage: "",
      setLiveMessage: (liveMessage) => set({ liveMessage }),
      rooms: [],
      setRooms: (rooms) => set({ rooms }),
      currentRoom: null,
      setCurrentRoom: (currentRoom) => set({ currentRoom }),
      duels: [],
      setDuels: (duels) => set({ duels }),
      activeDuel: null,
      setActiveDuel: (activeDuel) => set({ activeDuel }),

      subject: "General",
      setSubject: (subject) => set({ subject }),
      studyMode: "custom",
      setStudyMode: (studyMode) => set({ studyMode }),
      plannedDuration: 45,
      setPlannedDuration: (plannedDuration) => set({ plannedDuration }),
      riskMode: false,
      setRiskMode: (riskMode) => set({ riskMode }),
      
      lastSyncAt: 0,
      setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
    }),
    {
      name: 'grindlock-storage',
      version: 1, // State migration versioning
      partialize: (state) => ({ 
        user: state.user, 
        screen: state.screen,
        subject: state.subject,
        studyMode: state.studyMode,
        plannedDuration: state.plannedDuration,
        riskMode: state.riskMode,
        lastSyncAt: state.lastSyncAt
      }),
    }
  )
);
