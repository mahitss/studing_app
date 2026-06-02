import { useEffect, useRef } from 'react';
import { socket, HAS_BACKEND, fetchDashboard, getLiveFriends, fetchDuels, fetchRooms } from '../lib/api';
import { useStore } from '../lib/store';

export function useSocketSync() {
  const { 
    user, 
    setLiveFriends, 
    setLiveMessage, 
    setDashboard,
    setDuels, 
    setRooms,
    setError 
  } = useStore();

  useEffect(() => {
    if (user && HAS_BACKEND) {
      socket.connect();
      socket.emit("authenticate", user._id);
      
      socket.on("connect_error", (err) => {
        console.warn("[GrindLock] Real-time engine connection error:", err.message);
      });

      socket.on("reconnect_attempt", (attempt) => {
        console.warn(`[GrindLock] Real-time engine attempting reconnection (Attempt ${attempt}/50)...`);
      });

      socket.on("reconnect_failed", () => {
        console.error("[GrindLock] Maximum reconnection attempts reached. Real-time engine offline.");
        setError("Maximum reconnection attempts reached. Real-time engine offline. Check your internet connection.");
      });

      socket.on("connect", () => {
        socket.emit("authenticate", user._id);
      });

      socket.on("friend-update", async () => {
        try {
          const { friends, liveMessage } = await getLiveFriends(user._id);
          setLiveFriends(friends);
          setLiveMessage(liveMessage);
        } catch {}
      });

      socket.on("duel-update", async () => {
        try {
          const duels = await fetchDuels(user._id);
          setDuels(duels);
        } catch {}
      });

      socket.on("room-update", async () => {
        try {
          const rooms = await fetchRooms();
          setRooms(rooms);
        } catch {}
      });

      socket.on("reconnect", () => {
        console.log("[GrindLock] Neural link restored. Resyncing...");
        socket.emit("authenticate", user._id);
        // Force refresh dash
        fetchDashboard(user._id).then(setDashboard).catch(() => {});
      });

      return () => {
        socket.off("connect");
        socket.off("connect_error");
        socket.off("reconnect_attempt");
        socket.off("reconnect_failed");
        socket.off("friend-update");
        socket.off("duel-update");
        socket.off("room-update");
        socket.off("reconnect");
        socket.disconnect();
      };
    }
  }, [user]);
}
