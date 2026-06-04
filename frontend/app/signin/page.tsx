"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import FloatingScene from "../../components/FloatingScene";
import { bootstrapUser, loginUser, saveAuthSession } from "../../lib/api";
import { signIn } from "next-auth/react";

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
        <div className="flex flex-col items-center gap-4 mb-2">
          <img src="/images/logo.png" alt="GrindLock" className="w-16 h-16 rounded-2xl object-contain" />
          <h1>Sign In</h1>
        </div>
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

        <div className="flex items-center gap-4 my-4 w-full">
          <div className="h-[1px] bg-white/10 flex-1" />
          <span className="text-[9px] font-black uppercase tracking-widest text-muted">OR</span>
          <div className="h-[1px] bg-white/10 flex-1" />
        </div>

        <div className="grid grid-cols-2 gap-4 w-full">
          <button 
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="flex items-center justify-center py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all text-xs font-bold uppercase tracking-wider text-white gap-2 min-h-[44px]"
            aria-label="Continue with Google"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>
          <button 
            type="button"
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
            className="flex items-center justify-center py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all text-xs font-bold uppercase tracking-wider text-white gap-2 min-h-[44px]"
            aria-label="Continue with GitHub"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
            </svg>
            GitHub
          </button>
        </div>
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

