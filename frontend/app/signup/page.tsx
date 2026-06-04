"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import { registerUser, saveAuthSession } from "../../lib/api";
import { signIn } from "next-auth/react";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  identity: z.enum(["Casual", "Serious", "Hardcore"]),
  why: z.string().min(3, "Motivation must be at least 3 characters"),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignUpPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "Focused Student",
      email: "",
      password: "",
      identity: "Serious",
      why: "Job - 12 LPA",
    },
  });

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

  const onSubmit = async (data: SignupFormValues) => {
    if (loading) return;
    try {
      setError("");
      setLoading(true);
      const response = await registerUser(
        data.name,
        data.email,
        data.password,
        "General",
        data.identity,
        data.why
      );
      saveAuthSession(response.user._id, response.token, response.refreshToken);
      toast.success("Welcome aboard! Neural uplink initialized.");
      router.push("/dashboard");
    } catch (err: any) {
      const errMsg = err.message || "Registration protocol failure.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-wrapper">
      <motion.section
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="auth-form max-w-[500px]"
      >
        <div className="flex flex-col items-center gap-4 mb-2">
          <img src="/images/logo.png" alt="GrindLock" className="w-16 h-16 rounded-2xl object-contain" />
          <h1>Create Account</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 text-left w-full mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label>Full Name</label>
              <input
                {...register("name")}
                placeholder="Focused Student"
                className={errors.name ? "border-red-500/50" : ""}
              />
              {errors.name && (
                <p className="text-red-400 text-[10px] uppercase font-bold tracking-wider">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label>Secure Email</label>
              <input
                type="email"
                {...register("email")}
                placeholder="name@domain.com"
                className={errors.email ? "border-red-500/50" : ""}
              />
              {errors.email && (
                <p className="text-red-400 text-[10px] uppercase font-bold tracking-wider">
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label>Master Password</label>
              <input
                type="password"
                {...register("password")}
                placeholder="Min. 8 characters"
                className={errors.password ? "border-red-500/50" : ""}
              />
              {errors.password && (
                <p className="text-red-400 text-[10px] uppercase font-bold tracking-wider">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label>Commitment Level</label>
              <select {...register("identity")}>
                <option value="Casual">Casual</option>
                <option value="Serious">Serious</option>
                <option value="Hardcore">Hardcore</option>
              </select>
              {errors.identity && (
                <p className="text-red-400 text-[10px] uppercase font-bold tracking-wider">
                  {errors.identity.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label>Why are you studying?</label>
            <input
              {...register("why")}
              placeholder="Your high-stakes motivation..."
              className={errors.why ? "border-red-500/50" : ""}
            />
            {errors.why && (
              <p className="text-red-400 text-[10px] uppercase font-bold tracking-wider">
                {errors.why.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary w-full mt-4 py-4 text-sm tracking-widest uppercase font-bold"
            disabled={loading}
          >
            {loading ? "Initializing..." : "Start My Journey"}
          </button>
        </form>

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

        <p className="text-xs text-center mt-6 text-muted font-medium">
          Already have account?{" "}
          <Link href="/signin" className="text-accent font-bold hover:underline">
            Sign in
          </Link>
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
