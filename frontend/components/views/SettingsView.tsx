import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import { User, Dashboard } from "../../lib/types";

interface SettingsViewProps {
  user: User | null;
  dashboard: Dashboard | null;
  goalDaily: number;
  goalWeekly: number;
  identityType: string;
  motivationWhy: string;
  summaryEmail: string;
  emailStatus: string;
  setGoalDaily: (val: number) => void;
  setGoalWeekly: (val: number) => void;
  setIdentityType: (val: any) => void;
  setMotivationWhy: (val: string) => void;
  setSummaryEmail: (val: string) => void;
  onGoalUpdate: () => void;
  onIdentityUpdate: () => void;
  onSendEmail: () => void;
}

const goalSchema = z.object({
  goalDaily: z
    .coerce.number()
    .min(1, "Daily target must be at least 1 minute")
    .max(1440, "Daily target cannot exceed 1440 minutes"),
  goalWeekly: z
    .coerce.number()
    .min(1, "Weekly target must be at least 1 minute")
    .max(10080, "Weekly target cannot exceed 10080 minutes"),
});

const identitySchema = z.object({
  identityType: z.enum(["Casual", "Serious", "Hardcore"]),
  motivationWhy: z
    .string()
    .min(3, "Motivation must be at least 3 characters")
    .max(250, "Motivation must be under 250 characters"),
});

const emailSchema = z.object({
  summaryEmail: z.string().email("Invalid email address"),
});

type GoalFormValues = z.infer<typeof goalSchema>;
type IdentityFormValues = z.infer<typeof identitySchema>;
type EmailFormValues = z.infer<typeof emailSchema>;

const SettingsView: React.FC<SettingsViewProps> = ({
  goalDaily,
  goalWeekly,
  identityType,
  motivationWhy,
  summaryEmail,
  emailStatus,
  setGoalDaily,
  setGoalWeekly,
  setIdentityType,
  setMotivationWhy,
  setSummaryEmail,
  onGoalUpdate,
  onIdentityUpdate,
  onSendEmail,
}) => {
  const {
    register: registerGoal,
    handleSubmit: handleSubmitGoal,
    formState: { errors: goalErrors },
  } = useForm({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      goalDaily,
      goalWeekly,
    },
  });

  const {
    register: registerIdentity,
    handleSubmit: handleSubmitIdentity,
    formState: { errors: identityErrors },
  } = useForm({
    resolver: zodResolver(identitySchema),
    defaultValues: {
      identityType: identityType as any,
      motivationWhy,
    },
  });

  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors },
  } = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      summaryEmail,
    },
  });

  const onGoalSubmit = (data: any) => {
    setGoalDaily(data.goalDaily);
    setGoalWeekly(data.goalWeekly);
    // Allow state to set before update triggers
    setTimeout(() => {
      onGoalUpdate();
      toast.success("Mission target updated successfully.");
    }, 50);
  };

  const onIdentitySubmit = (data: any) => {
    setIdentityType(data.identityType);
    setMotivationWhy(data.motivationWhy);
    setTimeout(() => {
      onIdentityUpdate();
      toast.success("Identity profile updated successfully.");
    }, 50);
  };

  const onEmailSubmit = (data: any) => {
    setSummaryEmail(data.summaryEmail);
    setTimeout(() => {
      onSendEmail();
    }, 50);
  };

  return (
    <div className="max-w-2xl space-y-12 pb-20">
      <form onSubmit={handleSubmitGoal(onGoalSubmit)} className="space-y-6">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted">Mission Config</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted">
              Daily Target (Min)
            </label>
            <input
              type="number"
              className={`w-full bg-white/5 border-white/10 ${
                goalErrors.goalDaily ? "border-red-500/50" : ""
              }`}
              {...registerGoal("goalDaily", { valueAsNumber: true })}
              aria-label="Daily mission target in minutes"
            />
            {goalErrors.goalDaily?.message && (
              <p className="text-red-400 text-[10px] uppercase font-bold tracking-wider">
                {String(goalErrors.goalDaily.message)}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted">
              Weekly Quota (Min)
            </label>
            <input
              type="number"
              className={`w-full bg-white/5 border-white/10 ${
                goalErrors.goalWeekly ? "border-red-500/50" : ""
              }`}
              {...registerGoal("goalWeekly", { valueAsNumber: true })}
              aria-label="Weekly mission quota in minutes"
            />
            {goalErrors.goalWeekly?.message && (
              <p className="text-red-400 text-[10px] uppercase font-bold tracking-wider">
                {String(goalErrors.goalWeekly.message)}
              </p>
            )}
          </div>
        </div>
        <button type="submit" className="btn-primary px-8 py-3 rounded-xl font-bold text-xs">
          Sync Config
        </button>
      </form>

      <form onSubmit={handleSubmitIdentity(onIdentitySubmit)} className="space-y-6">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted">Identity Profile</h3>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted">
              Commitment Level
            </label>
            <select className="w-full bg-white/5 border-white/10" {...registerIdentity("identityType")}>
              <option value="Casual">Casual</option>
              <option value="Serious">Serious</option>
              <option value="Hardcore">Hardcore</option>
            </select>
            {identityErrors.identityType?.message && (
              <p className="text-red-400 text-[10px] uppercase font-bold tracking-wider">
                {String(identityErrors.identityType.message)}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted">
              Motivation Core (The "Why")
            </label>
            <textarea
              className={`w-full bg-white/5 border-white/10 p-4 rounded-xl ${
                identityErrors.motivationWhy ? "border-red-500/50" : ""
              }`}
              {...registerIdentity("motivationWhy")}
              rows={3}
            />
            {identityErrors.motivationWhy?.message && (
              <p className="text-red-400 text-[10px] uppercase font-bold tracking-wider">
                {String(identityErrors.motivationWhy.message)}
              </p>
            )}
          </div>
          <button type="submit" className="btn-primary px-8 py-3 rounded-xl font-bold text-xs">
            Update Identity
          </button>
        </div>
      </form>

      <form onSubmit={handleSubmitEmail(onEmailSubmit)} className="space-y-6">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted">Transmission Protocol</h3>
        <div className="glass-card p-8 border-l-4 border-l-accent space-y-6 border border-white/5">
          <p className="text-xs font-medium text-white/70 italic uppercase tracking-wider leading-relaxed">
            Transmit your current progress summary to your command center (email).
          </p>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <input
                type="email"
                placeholder="commander@example.com"
                className={`w-full bg-black/40 border-white/10 ${
                  emailErrors.summaryEmail ? "border-red-500/50" : ""
                }`}
                {...registerEmail("summaryEmail")}
              />
              {emailErrors.summaryEmail?.message && (
                <p className="text-red-400 text-[10px] uppercase font-bold tracking-wider">
                  {String(emailErrors.summaryEmail.message)}
                </p>
              )}
            </div>
            <button
              type="submit"
              className={`px-8 h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
                emailStatus === "delivered"
                  ? "bg-success text-white"
                  : emailStatus === "failed"
                  ? "bg-danger text-white"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
              disabled={emailStatus === "transmitting"}
            >
              {emailStatus === "transmitting"
                ? "SENDING..."
                : emailStatus === "delivered"
                ? "SENT"
                : emailStatus === "failed"
                ? "RETRY"
                : "TRANSMIT"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SettingsView;
