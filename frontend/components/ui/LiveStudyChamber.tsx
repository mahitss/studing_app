import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Plus, Activity, AlertTriangle, Zap } from 'lucide-react';
import { updateRoomNotes, voteAmbient, broadcastEmergencyAlert, placeXPBet, submitGroupAIQuery } from '../../lib/api';
import { unescapeHtml } from '../../lib/utils';

interface LiveStudyChamberProps {
  onClose: () => void;
  room: any;
  socket: any;
  userId: string;
}

export default function LiveStudyChamber({ onClose, room, socket, userId }: LiveStudyChamberProps) {
  const [messages, setMessages] = useState<{user: string, text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [sharedNotes, setSharedNotes] = useState("");
  const [members, setMembers] = useState<any[]>([]);
  const [ambientSetting, setAmbientSetting] = useState("focus-deep");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isBettingOpen, setIsBettingOpen] = useState(false);
  const [betAmount, setBetAmount] = useState(100);

  useEffect(() => {
    if (!socket || !room?._id) return;
    socket.emit("join-room", { roomId: room._id, userId });
    socket.on("room-update", (data: any) => {
      setMembers(data.members || []);
      setSharedNotes(data.notes || "");
      setAmbientSetting(data.ambient || "focus-deep");
    });
    socket.on("notes-updated", (data: any) => {
      if (data.userId !== userId) setSharedNotes(data.notes);
    });
    socket.on("ambient-changed", (data: any) => {
      setAmbientSetting(data.track);
      setMessages(prev => [...prev, { user: "SYSTEM", text: `Ambient environment switched to: ${data.track}` }]);
    });
    socket.on("emergency-alert", (data: any) => {
      setAlerts(prev => [...prev, data]);
      setTimeout(() => setAlerts(prev => prev.filter(a => a !== data)), 5000);
    });
    socket.on("ai-coach-broadcast", (data: any) => {
      setMessages(prev => [...prev, { user: "NEURAL_COACH", text: data.message }]);
    });
    socket.on("bet-placed", (data: any) => {
      setMessages(prev => [...prev, { user: "SYSTEM", text: `${data.userName} bet ${data.amount} XP on ${data.outcome}` }]);
    });
    socket.on("room-action", (data: any) => {
      if (data.action === "chat") {
        setMessages((prev) => [...prev, { user: data.userName || "Unknown", text: data.message }]);
      }
    });
    return () => {
      socket.emit("leave-room", { roomId: room._id, userId });
      socket.off("room-update");
      socket.off("notes-updated");
      socket.off("ambient-changed");
      socket.off("emergency-alert");
      socket.off("ai-coach-broadcast");
      socket.off("bet-placed");
      socket.off("room-action");
    };
  }, [socket, room?._id, userId]);

  const notesTimeoutRef = useRef<NodeJS.Timeout>();
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setSharedNotes(newNotes);
    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
    notesTimeoutRef.current = setTimeout(() => {
      updateRoomNotes(room._id, userId, newNotes);
    }, 1000);
  };

  const sendChat = () => {
    if (!chatInput.trim() || !socket) return;
    if (chatInput.startsWith("/coach ")) {
      submitGroupAIQuery(room._id, userId, chatInput.replace("/coach ", ""));
    } else {
      socket.emit("room-action", { action: "chat", roomId: room?._id, message: chatInput, userId });
    }
    setChatInput("");
  };

  const handleVoteAmbient = (trackId: string) => {
    voteAmbient(room._id, userId, trackId);
  };

  const handleAlert = (type: string) => {
    broadcastEmergencyAlert(room._id, userId, type, "Liaison requested. Focus burnout imminent.");
  };

  const handleBet = (outcome: string) => {
    placeXPBet(room._id, userId, betAmount, outcome);
    setIsBettingOpen(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/90 backdrop-blur-3xl"
    >
      <div className="w-full max-w-7xl h-[82vh] glass-card overflow-hidden flex shadow-[0_0_100px_rgba(62,99,221,0.2)]">
        <div className="flex-1 flex flex-col relative border-r border-white/5 bg-black/20">
          <div className="absolute top-0 w-full p-6 z-20 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em]">{unescapeHtml(room?.name || "Neural Hub")}</h3>
                <p className="text-[10px] text-muted font-bold tracking-widest uppercase mt-1">Cluster Protocol: Active</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsNotesOpen(!isNotesOpen)} className={`nav-btn p-3 ${isNotesOpen ? "bg-accent text-black" : ""}`}>
                <Activity size={18} />
              </button>
              <button onClick={() => handleAlert("burnout")} className="nav-btn p-3 bg-danger/10 text-danger border-danger/20 hover:bg-danger/20">
                <AlertTriangle size={18} />
              </button>
              <button onClick={onClose} className="btn-secondary px-6 py-3 text-xs font-black uppercase tracking-widest">Disconnect</button>
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden">
            <video autoPlay playsInline muted className={`w-full h-full object-cover transition-all duration-1000 ${ambientSetting === "focus-deep" ? "grayscale contrast-125" : ""}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 pointer-events-none" />
            
            <div className="absolute top-24 left-6 z-30 space-y-3">
              {alerts.map((a, i) => (
                <motion.div key={i} initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="p-4 glass border-l-4 border-l-danger bg-danger/5 shadow-2xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-danger">Distress Signal: {a.userName}</p>
                  <p className="text-xs font-medium mt-1">{a.message}</p>
                </motion.div>
              ))}
            </div>

            <AnimatePresence>
              {isNotesOpen && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute inset-20 z-40 glass-card p-10 shadow-2xl flex flex-col">
                  <h4 className="text-xs font-black uppercase tracking-[0.3em] text-accent mb-6 flex items-center justify-between">Shared Neural Pad <button onClick={() => setIsNotesOpen(false)}><Plus className="rotate-45" /></button></h4>
                  <textarea value={sharedNotes} onChange={handleNotesChange} className="flex-1 bg-transparent border-none focus:ring-0 text-lg leading-relaxed placeholder:opacity-20" placeholder="Lock in shared insights..." />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-8 glass-light border-t border-white/5 flex items-center justify-between">
             <div className="flex gap-4">
                <button onClick={() => handleVoteAmbient("rain")} className="px-4 py-2 rounded-lg bg-white/5 text-[10px] font-bold">RAIN</button>
                <button onClick={() => handleVoteAmbient("lofi")} className="px-4 py-2 rounded-lg bg-white/5 text-[10px] font-bold">LOFI</button>
                <button onClick={() => handleVoteAmbient("focus-deep")} className="px-4 py-2 rounded-lg bg-white/5 text-[10px] font-bold">DEEP_CORE</button>
             </div>
             <button onClick={() => setIsBettingOpen(true)} className="btn-primary py-2 px-6 text-[10px] tracking-[0.2em]">PLACE XP BET</button>
          </div>
        </div>

        <div className="w-80 flex flex-col bg-black/40 backdrop-blur-xl">
          <div className="p-8 border-b border-white/5">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-6">Neural Cluster</h4>
            <div className="flex flex-wrap gap-3">
              {members.map((m: any) => (
                <div key={m._id} className="relative group">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center border border-accent/30 text-xs font-bold transition-all group-hover:scale-110">{m.name?.[0] || "A"}</div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success border-2 border-black" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.user === "NEURAL_COACH" ? "items-center" : m.user === userId ? "items-end" : "items-start"}`}>
                <p className="text-[8px] font-black uppercase tracking-widest text-muted mb-1">{m.user === userId ? "YOU" : m.user}</p>
                <div className={`max-w-[90%] p-4 rounded-2xl text-xs font-medium ${
                  m.user === "NEURAL_COACH" ? "bg-accent/10 border border-accent/20 text-accent text-center italic" : 
                  m.user === "SYSTEM" ? "bg-white/5 border border-white/5 text-muted opacity-80" :
                  m.user === userId ? "bg-accent/20 border border-accent/10 rounded-tr-none" : "bg-white/5 border border-white/10 rounded-tl-none"
                }`}>{m.text}</div>
              </div>
            ))}
          </div>

          <div className="p-8 border-t border-white/5">
            <div className="flex gap-2">
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Type message..." className="flex-1 bg-white/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-accent/50 border border-transparent transition-all" />
              <button onClick={sendChat} className="bg-accent p-3 rounded-xl text-black"><Send size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isBettingOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl">
             <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-card p-10 w-96 text-center">
                <Zap size={32} className="text-accent mx-auto mb-6" />
                <h3 className="display-sm mb-4">Neural Outcome Bet</h3>
                <div className="flex items-center justify-between mb-8 p-4 glass-light rounded-xl">
                   <button onClick={() => setBetAmount(Math.max(10, betAmount - 50))} className="p-2 nav-btn"> - </button>
                   <span className="text-lg font-black">{betAmount} XP</span>
                   <button onClick={() => setBetAmount(betAmount + 50)} className="p-2 nav-btn"> + </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <button onClick={() => handleBet("success")} className="py-4 rounded-xl bg-success/20 text-success font-black text-[10px] uppercase tracking-widest">SUCCESS</button>
                   <button onClick={() => handleBet("failure")} className="py-4 rounded-xl bg-danger/20 text-danger font-black text-[10px] uppercase tracking-widest">FAILURE</button>
                </div>
                <button onClick={() => setIsBettingOpen(false)} className="mt-8 text-[10px] text-muted font-bold uppercase tracking-widest">Cancel</button>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
