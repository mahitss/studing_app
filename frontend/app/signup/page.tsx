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
        <h1>Create Account</h1>

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
