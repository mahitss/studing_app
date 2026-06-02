"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { subscribeWaitlist } from "../lib/api";

function Confetti() {
  return (
    <div className="absolute inset-0 pointer-events-none flex justify-center items-center">
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, scale: 0 }}
          animate={{ 
            x: (Math.random() - 0.5) * 400, 
            y: (Math.random() - 0.5) * 400,
            scale: [0, 1, 0],
            rotate: Math.random() * 360
          }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute w-2 h-2 rounded-full"
          style={{ backgroundColor: ['#00F0FF', '#ffffff', '#a78bfa'][Math.floor(Math.random() * 3)] }}
        />
      ))}
    </div>
  );
}

export default function LandingWaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  const progress = email.length === 0 ? 0 : isValid ? 100 : Math.min(email.length * 5, 80);

  const onSubmit = async () => {
    if (!isValid) {
      setStatus("Invalid neural signature (email).");
      return;
    }
    try {
      setLoading(true);
      setStatus("");
      const res = await subscribeWaitlist(email, "landing-hero");
      setStatus(res.message);
      setEmail("");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    } catch (err) {
      setStatus((err as Error).message || "Could not subscribe right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      {showConfetti && <Confetti />}
      <form 
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        className="flex flex-col sm:flex-row gap-3 items-center relative z-10"
      >
        <div className="flex-1 w-full relative">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Priority access email"
            aria-label="Email for priority access"
            className="w-full px-6 py-4 rounded-full glass-light border border-white/10 text-white placeholder-white/50 focus:outline-none focus:border-[#00F0FF]/50 transition-all duration-300 font-medium"
          />
          <div className="absolute bottom-0 left-0 h-0.5 bg-white/10 w-full rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-[#00F0FF]"
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 100 }}
            />
          </div>
        </div>
        <motion.button
          type="submit"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={loading || (email.length > 0 && !isValid)}
          aria-label="Join the elite waitlist"
          className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-black font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-white/5 whitespace-nowrap overflow-hidden relative"
        >
          {loading ? "Synchronizing..." : "Join the Elite"}
        </motion.button>
      </form>
      <AnimatePresence>
        {status && (
          <motion.p
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -bottom-8 left-6 text-xs font-bold tracking-widest text-[#00F0FF] uppercase"
          >
            {status}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}