import React from 'react';
import { RefreshCw } from 'lucide-react';

interface NeuralAnalyticsProps {
  data: any;
}

export default function NeuralAnalytics({ data }: NeuralAnalyticsProps) {
  const isLoading = !data || data.loading || Object.keys(data).length === 0;

  const Skeleton = ({ className }: { className?: string }) => (
    <div className={`bg-white/5 animate-pulse rounded-xl ${className}`} />
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      <div className="space-y-10">
        <div className="grid grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Efficiency Rating</p>
            {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-black">{data.focus_score || 0}%</p>}
          </div>
          <div className="glass-card p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Consistency Index</p>
            {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-black">{data.consistency_score || 0}%</p>}
          </div>
        </div>
        <div className="glass-card p-8 min-h-[300px] flex flex-col">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted mb-6">ML Focus Trajectory</h3>
          <div className="flex-1 relative min-h-[200px]">
            {isLoading ? (
              <Skeleton className="absolute inset-0" />
            ) : data.graphs?.focus_trend ? (
              <img src={`data:image/png;base64,${data.graphs.focus_trend}`} className="w-full h-full object-contain rounded-xl border border-white/5" alt="Focus trend chart" />
            ) : (
               <div className="absolute inset-0 bg-white/5 rounded-xl flex items-center justify-center text-[10px] font-black uppercase text-muted">Awaiting Neural Map...</div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-10">
        <div className="glass-card p-8 min-h-[300px] flex flex-col">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted mb-6">Knowledge Cluster Distribution</h3>
          <div className="flex-1 relative min-h-[200px]">
            {isLoading ? (
              <Skeleton className="absolute inset-0" />
            ) : data.graphs?.subject_distribution ? (
              <img src={`data:image/png;base64,${data.graphs.subject_distribution}`} className="w-full h-full object-contain mx-auto" alt="Subject distribution chart" />
            ) : (
              <div className="absolute inset-0 bg-white/5 rounded-xl flex items-center justify-center text-[10px] font-black uppercase text-muted">No Cluster Data</div>
            )}
          </div>
        </div>

        <div className="glass-card p-8 bg-gradient-to-br from-accent/20 to-transparent border-none">
           <h3 className="text-xs font-black uppercase tracking-widest text-accent mb-4">Neural Insight</h3>
           {isLoading ? (
             <div className="space-y-2">
               <Skeleton className="h-4 w-full" />
               <Skeleton className="h-4 w-3/4" />
             </div>
           ) : (
             <p className="text-sm font-bold italic leading-relaxed text-white">&quot;{data.message || "Awaiting intelligence downlink..."}&quot;</p>
           )}
        </div>
      </div>
    </div>
  );
}
