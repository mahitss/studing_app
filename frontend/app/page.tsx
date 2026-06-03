"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Music2, 
  Flame, 
  Zap, 
  Shield, 
  Award, 
  Activity, 
  ArrowRight,
  Sparkle,
  Lock,
  ChevronRight
} from "lucide-react";

export default function StudyTrackerLandingPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = React.useState(true);

  React.useEffect(() => {
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

  return (
    <main className="relative w-full min-h-[115vh] overflow-x-hidden flex flex-col items-center font-sans selection:bg-white/20 selection:text-white">
      {/* Background Video */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-[0]"
      >
        <source 
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260429_114316_1c7889ad-2885-410e-b493-98119fee0ddb.mp4" 
          type="video/mp4" 
        />
      </video>

      {/* Video Overlay for better readability */}
      <div className="fixed inset-0 bg-black/60 z-[1] pointer-events-none" />

      {/* Content Wrapper */}
      <div className="relative z-10 w-full max-w-7xl px-6 md:px-12 flex flex-col items-center flex-1">
        
        {/* Navigation Bar */}
        <header className="w-full py-8 flex justify-between items-center border-b border-white/10 mb-16">
          <div className="flex items-center gap-3">
            <img src="/images/logo.png" alt="GrindLock Logo" className="w-9 h-9 rounded-lg object-contain" />
            <span className="text-xl font-bold tracking-widest text-white uppercase">GRINDLOCK</span>

          </div>
          <nav className="flex items-center gap-6">
            <button 
              onClick={() => router.push("/signin")} 
              className="text-sm font-semibold tracking-wider text-white/80 hover:text-white transition-colors"
            >
              LOGIN
            </button>
            <button 
              onClick={() => router.push("/signup")} 
              className="bg-white text-black px-6 py-2.5 rounded-full text-xs font-bold tracking-wider hover:bg-white/90 transition-all hover:scale-105"
            >
              INITIALIZE
            </button>
          </nav>
        </header>

        {/* Upper CTA / Hero Section */}
        <section className="flex-1 flex flex-col items-center justify-center text-center max-w-4xl py-12 md:py-24">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/5 backdrop-blur-md">
              <Sparkle size={12} className="text-white/80" />
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/90">DEEP FOCUS INFRASTRUCTURE</span>
            </div>
            
            <h1 className="text-5xl md:text-8xl font-extrabold tracking-tighter text-white leading-[1.05] uppercase">
              Master Your Focus.<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/70 to-white/40">
                Hack Your Potential.
              </span>
            </h1>
            
            <p className="text-white/60 text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-light">
              A high-fidelity discipline-first study tracker designed for absolute accountability. Wire your brain for deep work with synchronized collaborative rooms, real-time streaks, and brutal analytics.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <button 
                onClick={() => router.push("/signup")}
                className="w-full sm:w-auto px-8 py-4 bg-white text-black text-sm font-bold uppercase tracking-wider rounded-full hover:bg-white/90 hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2"
              >
                Start My Journey <ChevronRight size={16} />
              </button>
              <button 
                onClick={() => router.push("/signin")}
                className="w-full sm:w-auto px-8 py-4 border border-white/20 bg-white/5 backdrop-blur-md text-white text-sm font-bold uppercase tracking-wider rounded-full hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                Access Dashboard
              </button>
            </div>
          </motion.div>

          {/* Feature Highlight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-24 text-left">
            {[
              {
                icon: <Flame className="text-white" size={24} />,
                title: "Streak Engine",
                desc: "Strict reset-on-miss tracking. Build momentum or slip and lose it all. No excuses."
              },
              {
                icon: <Activity className="text-white" size={24} />,
                title: "Reality Reports",
                desc: "Deep visual analytics tracking focused minutes, wasted hours, and focus quality indices."
              },
              {
                icon: <Shield className="text-white" size={24} />,
                title: "Anti-Cheat Audit",
                desc: "Integrated tab-switch detection and idle warning thresholds to safeguard focus integrity."
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 + idx * 0.1, ease: "easeOut" }}
                className="p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md hover:border-white/25 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-wide">{feature.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <motion.footer 
          initial={{ opacity: 0, y: 40 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
          className="liquid-glass w-full rounded-3xl p-6 md:p-10 text-white/70 mt-32 md:mt-64 mb-12"
        >
          {/* Footer Top Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12 mb-10">
            {/* Brand Column */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 256 256" 
                  fill="currentColor" 
                  className="text-white"
                >
                  <path d="M 4.688 136 C 68.373 136 120 187.627 120 251.312 C 120 252.883 119.967 254.445 119.905 256 L 0 256 L 0 136.096 C 1.555 136.034 3.117 136 4.688 136 Z M 251.312 136 C 252.883 136 254.445 136.034 256 136.096 L 256 256 L 136.095 256 C 136.032 254.438 136.001 252.875 136 251.312 C 136 187.627 187.627 136 251.312 136 Z M 119.905 0 C 119.967 1.555 120 3.117 120 4.688 C 120 68.373 68.373 120 4.687 120 C 3.117 120 1.555 119.967 0 119.905 L 0 0 Z M 256 119.905 C 254.445 119.967 252.883 120 251.312 120 C 187.627 120 136 68.373 136 4.687 C 136 3.117 136.033 1.555 136.095 0 L 256 0 Z" />
                </svg>
                <span className="text-xl font-medium text-white uppercase tracking-wider">GRINDLOCK</span>
              </div>
              <p className="text-sm leading-relaxed max-w-sm">
                GrindLock provides premium clarity on academic milestones and discipline limits - shared with focus-oriented students for free.
              </p>
            </div>

            {/* Links Columns */}
            <div className="md:col-span-7 grid grid-cols-3 gap-6">
              {/* Discover Column */}
              <div>
                <h4 className="text-sm uppercase tracking-wider text-white font-medium mb-4">Discover</h4>
                <ul className="text-xs space-y-2">
                  {["Labs & Workshops", "Deep Dive Series", "Global Circle", "Resource Vault", "Future Roadmap"].map((item, index) => (
                    <li key={index}>
                      <a href="#" className="hover:text-white transition-colors">{item}</a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* The Mission Column */}
              <div>
                <h4 className="text-sm uppercase tracking-wider text-white font-medium mb-4">The Mission</h4>
                <ul className="text-xs space-y-2">
                  {["Origin Story", "The Collective", "Newsroom Hub", "Join the Team"].map((item, index) => (
                    <li key={index}>
                      <a href="#" className="hover:text-white transition-colors">{item}</a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Concierge Column */}
              <div>
                <h4 className="text-sm uppercase tracking-wider text-white font-medium mb-4">Concierge</h4>
                <ul className="text-xs space-y-2">
                  {["Get in Touch", "Legal Privacy", "User Agreement", "Report Concern"].map((item, index) => (
                    <li key={index}>
                      <a href="#" className="hover:text-white transition-colors">{item}</a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-50">Curated by @GotInGeorgiG</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] uppercase tracking-widest opacity-50">Join the Journey:</span>
              <div className="flex items-center gap-3">
                <a href="#" className="opacity-70 hover:opacity-100 transition-colors hover:text-white text-white/80">
                  <Music2 size={16} />
                </a>
                <a href="#" className="opacity-70 hover:opacity-100 transition-colors hover:text-white text-white/80" aria-label="Facebook">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </a>
                <a href="#" className="opacity-70 hover:opacity-100 transition-colors hover:text-white text-white/80" aria-label="Twitter">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
                </a>
                <a href="#" className="opacity-70 hover:opacity-100 transition-colors hover:text-white text-white/80" aria-label="Youtube">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>
                </a>
                <a href="#" className="opacity-70 hover:opacity-100 transition-colors hover:text-white text-white/80" aria-label="Instagram">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </a>
              </div>
            </div>
          </div>
        </motion.footer>

      </div>
    </main>
  );
}