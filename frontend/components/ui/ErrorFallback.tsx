import React from 'react';

export function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#070b13] text-[#e6edf9] p-6 font-sans">
      <div className="max-w-md w-full border border-red-500/20 bg-[#0c1220]/80 backdrop-blur-xl p-8 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.1)] text-center relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-red-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-red-500/10 blur-3xl" />

        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6 border border-red-500/30">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h2 className="text-xl font-bold font-display text-white mb-2 tracking-wide uppercase">Neural Link Failure</h2>
        <p className="text-sm text-[#8a99ad] mb-6">
          A fatal crash occurred in the interface. Systems halted.
        </p>

        <div className="p-4 bg-red-950/20 border border-red-500/10 rounded-xl mb-6 text-left overflow-x-auto font-mono">
          <code className="text-xs text-red-400 block whitespace-pre-wrap">
            {error.message || 'Unknown render exception.'}
          </code>
        </div>

        <button
          onClick={resetErrorBoundary}
          className="w-full py-3 px-6 rounded-xl font-semibold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
        >
          Reboot Neural Interface
        </button>
      </div>
    </div>
  );
}
