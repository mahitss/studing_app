import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Send, MessageSquare } from 'lucide-react';
import { getAICoachReply } from '../../lib/api';

interface NeuralCoachProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function NeuralCoach({ userId, isOpen, onClose }: NeuralCoachProps) {
  const [messages, setMessages] = useState<{ role: "assistant" | "user", content: string }[]>([
    { role: "assistant", content: "Neural Coach active. Protocol: Maximum Discipline. How can I assist your grind?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement;
      // Focus input field once transition begins
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
        if (e.key === "Tab") {
          const focusable = [
            closeButtonRef.current,
            inputRef.current,
            sendButtonRef.current
          ].filter(Boolean) as HTMLElement[];

          if (focusable.length > 0) {
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
              if (document.activeElement === first) {
                last.focus();
                e.preventDefault();
              }
            } else {
              if (document.activeElement === last) {
                first.focus();
                e.preventDefault();
              }
            }
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("keydown", handleKeyDown);
        // Restore focus on close
        setTimeout(() => {
          previouslyFocusedRef.current?.focus();
        }, 50);
      };
    }
  }, [isOpen, onClose]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const reply = await getAICoachReply(userId, userMsg);
      setMessages(prev => [...prev, { role: "assistant", content: reply?.reply || "Neural engine recalibrating. Continue focus." }]);
    } catch (err) {
      console.error("Neural Coach Error:", err);
      setMessages(prev => [...prev, { role: "assistant", content: "Neural transmission failed. Focus on the core mission." }]);
    } finally {
      setLoading(false);
      // Refocus input field after sending
      inputRef.current?.focus();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, x: 400 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 400 }}
          className="fixed right-0 top-0 h-full w-96 bg-black/80 backdrop-blur-3xl border-l border-white/5 z-[150] flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="coach-title"
        >
          <div className="p-8 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 id="coach-title" className="text-xs font-black uppercase tracking-widest text-accent">Neural Coach</h3>
              <p className="text-[8px] font-black tracking-widest text-muted uppercase mt-1">Direct Uplink: Active</p>
            </div>
            <button 
              ref={closeButtonRef}
              onClick={onClose} 
              className="nav-btn p-2 hover:bg-white/5"
              aria-label="Close Neural Coach"
            >
              <Plus className="rotate-45" size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === "assistant" ? "items-start" : "items-end"}`}>
                <p className="text-[8px] font-black uppercase tracking-widest text-muted mb-2">{m.role === "assistant" ? "COACH" : "OPERATIVE"}</p>
                <div className={`p-4 rounded-2xl text-xs font-medium leading-relaxed ${m.role === "assistant" ? "bg-white/5 border border-white/5 rounded-tl-none" : "bg-accent/20 border border-accent/10 rounded-tr-none"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <div className="text-[8px] font-black uppercase tracking-widest text-accent animate-pulse">Neural engine processing...</div>}
          </div>

          <div className="p-8 border-t border-white/5 bg-black/20">
            <div className="flex gap-2">
              <input 
                ref={inputRef}
                type="text" 
                value={input} 
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Request strategy optimization..." 
                className="flex-1 bg-white/5 border-none rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-accent/50"
                aria-label="Message text for Neural Coach"
              />
              <button 
                ref={sendButtonRef}
                onClick={sendMessage} 
                className="bg-accent p-3 rounded-xl text-black transition-all hover:scale-105 active:scale-95"
                aria-label="Send message to Neural Coach"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

