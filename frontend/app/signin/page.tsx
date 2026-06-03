"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import FloatingScene from "../../components/FloatingScene";
import { bootstrapUser, loginUser, saveAuthSession } from "../../lib/api";

export default function SignInPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem("study-tracker-user-id");
    if (userId) {
      router.replace("/dashboard");
    } else {
      setCheckingSession(false);
    }
  }, [router]);

  if (checkingSession) {
    return (
      <div className="auth-wrapper relative z-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-xs font-black tracking-widest text-accent animate-pulse uppercase">Retrieving session...</p>
        </div>
      </div>
    );
  }

  const onLogin = async () => {
    if (loading) return;
    try {
      setError("");
      setLoading(true);
      const response = await loginUser(email, password);
      saveAuthSession(response.user._id, response.token, response.refreshToken);
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const onGuest = async () => {
    if (loading) return;
    try {
      setError("");
      setLoading(true);
      const response = await bootstrapUser("Focused Student", "General", "Serious", "Skill");
      saveAuthSession(response.user._id, response.token, response.refreshToken);
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message || "Guest setup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-wrapper">
      <div className="absolute inset-0 z-0">
        <FloatingScene />
      </div>

      <motion.section 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="auth-form"
      >
        <h1>Sign In</h1>
        <div className="flex flex-col gap-6 text-left w-full">
          <div className="space-y-2">
            <label>Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@domain.com" />
          </div>
          <div className="space-y-2">
            <label>Master Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
        </div>
        
        <button className="btn-primary w-full mt-8 py-4 text-sm tracking-widest uppercase font-bold" onClick={onLogin} disabled={loading}>
          {loading ? "Decrypting..." : "Access System"}
        </button>
        <button className="w-full py-4 text-xs font-bold text-muted uppercase tracking-widest hover:text-white transition-colors" onClick={onGuest} disabled={loading}>
          Enter as Guest
        </button>
        
        <p className="text-xs text-center mt-6 text-muted font-medium">
          New operative? <Link href="/signup" className="text-accent font-bold hover:underline">Register Identity</Link>
        </p>
        
        {error && (
          <div className="mt-8 p-4 glass rounded-2xl border-l-2 border-danger animate-shake">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
              <span className="text-xs font-bold text-danger uppercase tracking-wider">{error}</span>
            </div>
          </div>
        )}
      </motion.section>
    </main>
  );
}

