import React from "react";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onActionClick?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onActionClick,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-[#0c1220]/40 backdrop-blur-xl border border-white/5 relative overflow-hidden"
    >
      <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

      {/* SVG Grid Illustration background */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.15] pointer-events-none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <pattern id="empty-state-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="currentColor" className="text-accent" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#empty-state-grid)" />
      </svg>

      <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-6 border border-accent/20 relative z-10">
        <Icon className="w-8 h-8 text-accent animate-pulse" />
      </div>

      <h3 className="text-lg font-bold font-display uppercase tracking-widest text-white mb-2">
        {title}
      </h3>
      
      <p className="text-xs text-muted max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {actionLabel && onActionClick && (
        <button
          onClick={onActionClick}
          className="btn-primary py-3 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
};
