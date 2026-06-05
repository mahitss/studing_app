import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import { User, Dashboard } from "../../lib/types";
import { Wallet, RefreshCw } from "lucide-react";

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
  onGoalUpdate: (daily: number, weekly: number) => Promise<void>;
  onIdentityUpdate: (identityType: "Casual" | "Serious" | "Hardcore", motivationWhy: string) => Promise<void>;
  onSendEmail: (email: string) => Promise<void>;
  roastMode: boolean;
  setRoastMode: (val: boolean) => void;
  webcamEnabled: boolean;
  setWebcamEnabled: (val: boolean) => void;
  onWeb3Update: (ethAddress: string | null) => Promise<void>;
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
  user,
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
  roastMode,
  setRoastMode,
  webcamEnabled,
  setWebcamEnabled,
  onWeb3Update,
}) => {
  const [linking, setLinking] = React.useState(false);

  const handleConnectWallet = async () => {
    if (typeof window === "undefined") return;
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      toast.error("No Ethereum wallet detected. Install MetaMask.");
      return;
    }
    try {
      setLinking(true);
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0];
      if (!address) throw new Error("No accounts found.");

      const message = `GrindLock Node Verification: Link address ${address.toLowerCase()} to account ${user?._id} at timestamp ${Date.now()}`;
      const signature = await ethereum.request({
        method: "personal_sign",
        params: [message, address],
      });

      if (signature) {
        await onWeb3Update(address);
        toast.success("Web3 wallet node linked and verified.");
      }
    } catch (err: any) {
      toast.error(err.message || "Web3 linking aborted.");
    } finally {
      setLinking(false);
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      setLinking(true);
      await onWeb3Update(null);
      toast.success("Web3 wallet unlinked.");
    } catch (err: any) {
      toast.error(err.message || "Failed to unlink wallet.");
    } finally {
      setLinking(false);
    }
  };
  const {
    register: registerGoal,
    handleSubmit: handleSubmitGoal,
    formState: { errors: goalErrors },
    reset: resetGoal,
  } = useForm({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      goalDaily,
      goalWeekly,
    },
  });

  // Re-sync form when API-loaded values arrive
  React.useEffect(() => {
    resetGoal({ goalDaily, goalWeekly });
  }, [goalDaily, goalWeekly, resetGoal]);

  const {
    register: registerIdentity,
    handleSubmit: handleSubmitIdentity,
    formState: { errors: identityErrors },
    reset: resetIdentity,
  } = useForm({
    resolver: zodResolver(identitySchema),
    defaultValues: {
      identityType: identityType as any,
      motivationWhy,
    },
  });

  React.useEffect(() => {
    resetIdentity({ identityType: identityType as any, motivationWhy });
  }, [identityType, motivationWhy, resetIdentity]);

  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors },
    reset: resetEmail,
  } = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      summaryEmail,
    },
  });

  React.useEffect(() => {
    resetEmail({ summaryEmail });
  }, [summaryEmail, resetEmail]);

  const onGoalSubmit = async (data: any) => {
    try {
      await onGoalUpdate(data.goalDaily, data.goalWeekly);
      toast.success("Mission target updated successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update goals.");
    }
  };

  const onIdentitySubmit = async (data: any) => {
    try {
      await onIdentityUpdate(data.identityType, data.motivationWhy);
      toast.success("Identity profile updated successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update identity profile.");
    }
  };

  const onEmailSubmit = async (data: any) => {
    try {
      await onSendEmail(data.summaryEmail);
    } catch (err: any) {
      toast.error(err.message || "Failed to transmit progress summary.");
    }
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
              aria-invalid={goalErrors.goalDaily ? "true" : "false"}
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
              aria-invalid={goalErrors.goalWeekly ? "true" : "false"}
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
            <select
              className="w-full bg-white/5 border-white/10"
              {...registerIdentity("identityType")}
              aria-invalid={identityErrors.identityType ? "true" : "false"}
            >
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
              Motivation Core (The &quot;Why&quot;)
            </label>
            <textarea
              className={`w-full bg-white/5 border-white/10 p-4 rounded-xl ${
                identityErrors.motivationWhy ? "border-red-500/50" : ""
              }`}
              {...registerIdentity("motivationWhy")}
              rows={3}
              aria-invalid={identityErrors.motivationWhy ? "true" : "false"}
            />
            {identityErrors.motivationWhy?.message && (
              <p className="text-red-400 text-[10px] uppercase font-bold tracking-wider">
                {String(identityErrors.motivationWhy.message)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 py-2">
            <input
              type="checkbox"
              id="roastMode"
              className="w-4 h-4 rounded border-white/10 bg-white/5 text-accent focus:ring-0 cursor-pointer"
              checked={roastMode}
              onChange={(e) => setRoastMode(e.target.checked)}
            />
            <label htmlFor="roastMode" className="text-[10px] font-black uppercase tracking-widest text-white/80 cursor-pointer select-none">
              AI Roast Mode (Enable brutal accountability messages)
            </label>
          </div>
          <button type="submit" className="btn-primary px-8 py-3 rounded-xl font-bold text-xs">
            Update Identity
          </button>
        </div>
      </form>

      <div className="space-y-6">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted">Webcam & Hardware</h3>
        <div className="glass-card p-6 border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Visual Focus Verification</p>
              <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Enable corner camera feed during study sessions</p>
            </div>
            <button
              onClick={() => setWebcamEnabled(!webcamEnabled)}
              className={`px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
                webcamEnabled 
                  ? "bg-accent/20 border border-accent/40 text-accent animate-pulse" 
                  : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10"
              }`}
            >
              {webcamEnabled ? "WEBCAM ACTIVE" : "WEBCAM INACTIVE"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted">Neural Web3 Registry</h3>
        <div className="glass-card p-6 border border-white/5 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <Wallet size={24} className="text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Cryptographic Identity</p>
              <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Link your Web3 wallet address to establish decentralized proof of focus consistency.</p>
            </div>
          </div>
          
          {user?.ethAddress ? (
            <div className="flex items-center justify-between p-4 bg-black/40 border border-success/20 rounded-xl">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-success">UPLINK ENCRYPTED</p>
                <p className="text-xs font-mono text-white/90 mt-1">
                  {user.ethAddress.slice(0, 6)}...{user.ethAddress.slice(-4)}
                </p>
              </div>
              <button
                onClick={handleDisconnectWallet}
                disabled={linking}
                className="text-[9px] font-black uppercase tracking-widest text-danger hover:underline"
              >
                UNLINK NODE
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectWallet}
              disabled={linking}
              className="btn-primary w-full py-3.5 rounded-xl font-bold text-xs tracking-wider flex items-center justify-center gap-2"
            >
              {linking ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  CONNECTING WALLET...
                </>
              ) : (
                <>
                  <Wallet size={14} />
                  LINK METAMASK WALLET
                </>
              )}
            </button>
          )}
        </div>
      </div>

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
                aria-invalid={emailErrors.summaryEmail ? "true" : "false"}
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
