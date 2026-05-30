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

  const retryCount = useRef(0);

  useEffect(() => {
    if (user && HAS_BACKEND) {
      const connect = () => {
        socket.connect();
        socket.emit("authenticate", user._id);
      };

      connect();
      
      socket.on("connect_error", (err) => {
        if (retryCount.current > 50) {
          console.error("[GrindLock] Maximum reconnection attempts reached. Real-time engine offline.");
          return;
        }
        const backoff = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
        console.warn(`[GrindLock] Real-time engine offline (Attempt ${retryCount.current + 1}):`, err.message);
        retryCount.current++;
        setTimeout(() => {
          if (user && HAS_BACKEND) socket.connect();
        }, backoff);
      });

      socket.on("connect", () => {
        retryCount.current = 0;
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
        socket.off("friend-update");
        socket.off("duel-update");
        socket.off("room-update");
        socket.off("reconnect");
        socket.disconnect();
      };
    }
  }, [user]);
}
