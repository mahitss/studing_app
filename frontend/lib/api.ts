import { Dashboard, LeaderboardEntry, LiveFriend, StudySession, User } from "./types";
import { mockRequest } from "./mockApi";
import { io } from "socket.io-client";

const USER_ID_KEY = "study-tracker-user-id";
let isSyncing = false;

// Use mock API whenever no explicit backend URL is configured.
export const HAS_BACKEND = 
  typeof window !== "undefined" && 
  localStorage.getItem("study-tracker-pref-mock") === "false" && 
  (process.env.NEXT_PUBLIC_DEMO_MODE !== "true");

const API_BASE_RAW = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "development" ? "http://localhost:5000/api" : "")).trim();
const API_BASE = API_BASE_RAW.replace(/\/+$/, "");
const SOCKET_URL = API_BASE ? API_BASE.replace(/\/api$/, "") : "";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
  timeout: 10000,
  transports: ["websocket", "polling"],
  withCredentials: true
});

export function saveAuthSession(userId: string, token?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_ID_KEY, userId);
  if (token) {
    localStorage.setItem("study-tracker-auth-token", token);
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem("study-tracker-auth-token");
}

let refreshPromise: Promise<string> | null = null;

async function refreshAuthToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const fullUrl = `${API_BASE}/auth/refresh`.replace(/([^:]\/)\/+/g, "$1");
      const res = await fetch(fullUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (!res.ok) {
        throw new Error("Failed to refresh token");
      }
      const data = await res.json();
      if (!data.token) {
        throw new Error("No token returned in refresh response");
      }
      localStorage.setItem("study-tracker-auth-token", data.token);
      return data.token;
    } catch (err) {
      clearAuthSession();
      throw err;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(path: string, init?: RequestInit, retries = 3): Promise<T> {
  if (!HAS_BACKEND) {
    return mockRequest<T>(path, init);
  }

  const executeRequest = async (attempt: number): Promise<T> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("study-tracker-auth-token") : null;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(init?.headers as Record<string, string> || {})
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const fullUrl = `${API_BASE}${path}`.replace(/([^:]\/)\/+/g, "$1");
      const res = await fetch(fullUrl, {
        ...init,
        signal: controller.signal,
        credentials: "include",
        headers,
        cache: "no-store"
      });
      clearTimeout(timeoutId);

      if (res.status === 401 && path !== "/auth/refresh" && path !== "/auth/login" && path !== "/auth/register" && path !== "/users/bootstrap") {
        try {
          const newToken = await refreshAuthToken();
          // Retry request with new token
          headers["Authorization"] = `Bearer ${newToken}`;
          const retryRes = await fetch(fullUrl, {
            ...init,
            credentials: "include",
            headers,
            cache: "no-store"
          });
          if (!retryRes.ok) {
            const errorData = await retryRes.json().catch(() => ({}));
            let errMsg = errorData.error?.message || errorData.message || `API Error ${retryRes.status}`;
            const error = new Error(errMsg);
            (error as any).status = retryRes.status;
            throw error;
          }
          return retryRes.json();
        } catch (refreshErr) {
          clearAuthSession();
          const error = new Error("Session expired. Please log in again.");
          (error as any).status = 401;
          throw error;
        }
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let errMsg = errorData.error?.message || errorData.message || `API Error ${res.status}`;
        if (errorData.error?.details && Array.isArray(errorData.error.details)) {
          const detailsStr = errorData.error.details.map((d: any) => d.message).join(", ");
          if (detailsStr) {
            errMsg = `${errMsg}: ${detailsStr}`;
          }
        }
        const error = new Error(errMsg);
        (error as any).status = res.status;
        throw error;
      }

      return res.json();
    } catch (err: any) {
      clearTimeout(timeoutId);
      
      const isTimeout = err.name === 'AbortError' && controller.signal.aborted;
      // Intentionally aborted requests should NOT be retried. 
      // isTimeout is only true if OUR controller.abort() was called.
      
      const isRetryableStatus = err.status
        ? ![400, 401, 403, 404, 422].includes(err.status)
        : true; // Network errors / timeouts are retryable

      if (attempt < retries && (isTimeout || isRetryableStatus)) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeRequest(attempt + 1);
      }
      
      if (err.message === 'Failed to fetch') {
        throw new Error('Backend server is unreachable. Ensure it is running on port 5000.');
      }
      throw err;
    }
  };

  return executeRequest(0);
}

export async function bootstrapUser(
  name: string,
  college: string,
  identityType = "Serious",
  motivationWhy = ""
): Promise<{ user: User; token: string; dashboard: Dashboard }> {
  return request("/users/bootstrap", {
    method: "POST",
    body: JSON.stringify({ name, college, identityType, motivationWhy })
  });
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
  college: string,
  identityType = "Serious",
  motivationWhy = ""
): Promise<{ user: User; token: string; dashboard: Dashboard }> {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, college, identityType, motivationWhy })
  });
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: User; token: string; dashboard: Dashboard }> {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function fetchDashboard(userId: string): Promise<Dashboard> {
  return request(`/users/${userId}/dashboard`);
}

export async function setTodayGoal(userId: string, targetMinutes: number): Promise<{ dashboard: Dashboard }> {
  return request(`/users/${userId}/goals/today`, {
    method: "PUT",
    body: JSON.stringify({ targetMinutes })
  });
}

export async function setGoalConfig(
  userId: string,
  payload: { dailyMinutes?: number; weeklyTargetMinutes?: number; weeklySessionTarget?: number }
): Promise<{ dashboard: Dashboard }> {
  return request(`/users/${userId}/goals/config`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function setModes(
  userId: string,
  roastMode: boolean,
  identityType?: "Casual" | "Serious" | "Hardcore",
  motivationWhy?: string,
  ethAddress?: string
): Promise<{ dashboard: Dashboard }> {
  return request(`/users/${userId}/modes`, {
    method: "PUT",
    body: JSON.stringify({ roastMode, identityType, motivationWhy, ethAddress })
  });
}

export async function startSession(
  userId: string,
  subject = "General",
  studyMode: "pomodoro" | "deep" | "custom" = "custom",
  plannedDurationMinutes = 0,
  riskMode = false
): Promise<{ session: StudySession }> {
  return request(`/users/${userId}/sessions/start`, {
    method: "POST",
    body: JSON.stringify({ subject, studyMode, plannedDurationMinutes, riskMode })
  });
}

export async function pauseSession(userId: string, sessionId: string, reason = "manual"): Promise<{ session: StudySession }> {
  return request(`/users/${userId}/sessions/${sessionId}/pause`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export async function resumeSession(userId: string, sessionId: string): Promise<{ session: StudySession }> {
  return request(`/users/${userId}/sessions/${sessionId}/resume`, {
    method: "POST",
    body: JSON.stringify({ sessionId })
  });
}

export async function endSession(
  userId: string,
  sessionId: string,
  inactiveSeconds: number,
  notes = "",
  subject = "",
  stopReason = "",
  antiCheatFlags = 0,
  sessionQualityTag: "deep" | "average" | "distracted" | "" = "",
  studyMode: "pomodoro" | "deep" | "custom" = "custom",
  plannedDurationMinutes = 0,
  riskMode = false
): Promise<{ session: StudySession; dashboard: Dashboard }> {
  return request(`/users/${userId}/sessions/${sessionId}/end`, {
    method: "POST",
    body: JSON.stringify({
      inactiveSeconds,
      notes,
      subject,
      stopReason,
      antiCheatFlags,
      sessionQualityTag,
      studyMode,
      plannedDurationMinutes,
      riskMode
    })
  });
}

export async function resetSession(
  userId: string,
  sessionId: string,
  stopReason = ""
): Promise<{ session: StudySession; dashboard: Dashboard }> {
  return request(`/users/${userId}/sessions/${sessionId}/reset`, {
    method: "POST",
    body: JSON.stringify({ stopReason })
  });
}

export async function getTodaySessions(userId: string): Promise<{ sessions: StudySession[]; serverTime?: string }> {
  return request(`/users/${userId}/sessions/today`);
}

export async function getLeaderboard(college: string): Promise<{ leaderboard: LeaderboardEntry[] }> {
  return request(`/leaderboard?college=${encodeURIComponent(college)}`);
}

export async function addFriend(
  userId: string,
  friendEmail: string
): Promise<{ friends: LiveFriend[] }> {
  return request(`/users/${userId}/friends/add`, {
    method: "POST",
    body: JSON.stringify({ friendEmail })
  });
}

export async function getLiveFriends(
  userId: string
): Promise<{ friends: LiveFriend[]; studyingNowCount: number; liveMessage: string }> {
  return request(`/users/${userId}/friends/live`);
}

export async function syncOfflineSessions(
  userId: string,
  sessions: Array<{
    startedAt: string;
    endedAt: string;
    focusedMinutes: number;
    inactiveSeconds?: number;
    pauseCount?: number;
    subject?: string;
    studyMode?: "pomodoro" | "deep" | "custom";
    plannedDurationMinutes?: number;
    riskMode?: boolean;
    notes?: string;
    stopReason?: string;
    sessionQualityTag?: "deep" | "average" | "distracted" | "";
    date?: string;
  }>
): Promise<{ synced: number; dashboard: Dashboard }> {
  if (isSyncing || sessions.length === 0) {
    return { synced: 0, dashboard: {} as Dashboard };
  }
  
  try {
    isSyncing = true;
    const res = await request<{ synced: number; dashboard: Dashboard }>(`/users/${userId}/sessions/offline-sync`, {
      method: "POST",
      body: JSON.stringify({ sessions })
    });
    return res;
  } finally {
    isSyncing = false;
  }
}

export async function subscribeWaitlist(
  email: string,
  source = "landing"
): Promise<{ ok: boolean; message: string }> {
  return request("/waitlist/subscribe", {
    method: "POST",
    body: JSON.stringify({ email, source })
  });
}

export async function sendProgressEmail(
  userId: string,
  email: string
): Promise<{ ok: boolean; message: string; summary?: { todayMinutes: number; weeklyHours: number; totalHours: number; completionRate: number } }> {
  return request(`/users/${userId}/email-summary`, {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export async function fetchRooms(): Promise<any[]> {
  return request("/rooms");
}

export async function createRoom(userId: string, data: any): Promise<any> {
  return request("/rooms", {
    method: "POST",
    body: JSON.stringify({ ...data, ownerId: userId })
  });
}

export async function joinRoom(userId: string, roomId: string): Promise<any> {
  return request(`/rooms/${roomId}/join`, {
    method: "POST",
    body: JSON.stringify({ userId })
  });
}

export async function getAICoachReply(userId: string, message: string): Promise<{ reply: string }> {
  return request(`/users/${userId}/ai-coach`, {
    method: "POST",
    body: JSON.stringify({ message })
  });
}

export async function fetchAnalytics(userId: string): Promise<any> {
  return request(`/users/${userId}/analytics`);
}

export async function challengeDuel(challengerId: string, opponentId: string, durationMinutes: number): Promise<any> {
  return request("/duels", {
    method: "POST",
    body: JSON.stringify({ challengerId, opponentId, durationMinutes })
  });
}

export async function fetchDuels(userId: string): Promise<any[]> {
  return request(`/duels/${userId}`);
}

export async function syncDuelProgress(duelId: string, userId: string, progress: number): Promise<any> {
  return request(`/duels/${duelId}/sync`, {
    method: "POST",
    body: JSON.stringify({ userId, progress })
  });
}

export async function updateRoomNotes(roomId: string, userId: string, notes: string): Promise<any> {
  return request(`/rooms/${roomId}/notes`, {
    method: "POST",
    body: JSON.stringify({ userId, notes })
  });
}

export async function voteAmbient(roomId: string, userId: string, trackId: string): Promise<any> {
  return request(`/rooms/${roomId}/vote-ambient`, {
    method: "POST",
    body: JSON.stringify({ userId, trackId })
  });
}

export async function broadcastEmergencyAlert(roomId: string, userId: string, type: string, message: string): Promise<any> {
  return request(`/rooms/${roomId}/alert`, {
    method: "POST",
    body: JSON.stringify({ userId, type, message })
  });
}

export async function submitGroupAIQuery(roomId: string, userId: string, message: string): Promise<any> {
  return request(`/rooms/${roomId}/ai-qa`, {
    method: "POST",
    body: JSON.stringify({ userId, message })
  });
}

export async function placeXPBet(roomId: string, userId: string, amount: number, outcome: string): Promise<any> {
  return request(`/rooms/${roomId}/bet`, {
    method: "POST",
    body: JSON.stringify({ userId, amount, outcome })
  });
}
