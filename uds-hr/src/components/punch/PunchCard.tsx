"use client";

import PunchTimer from "./PunchTimer";
import PunchToggle from "./PunchToggle";

interface PunchCardProps {
  isPunchedIn: boolean;
  elapsedSeconds: number;
  onToggle: () => void;
  syncing?: boolean;
  ready?: boolean;
  geoLoading?: boolean;
  geoError?: string | null;
}

export default function PunchCard({
  isPunchedIn,
  elapsedSeconds,
  onToggle,
  syncing = false,
  ready = true,
  geoLoading = false,
  geoError = null,
}: PunchCardProps) {
  const canPunch = ready && !geoLoading;

  return (
    <section className="bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50 p-6 mb-6 relative overflow-hidden group">
      {/* Background glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700" />

      <div className="flex flex-col items-center text-center relative z-10">
        <h2 className="text-sm font-medium uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-6">
          Current Status
        </h2>

        {!ready ? (
          /* Loading skeleton while punch state is being determined */
          <div className="mb-8 animate-pulse">
            <div className="h-12 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mx-auto mb-2" />
            <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded mx-auto" />
          </div>
        ) : (
          <PunchTimer elapsedSeconds={elapsedSeconds} isPunchedIn={isPunchedIn} />
        )}

        {!canPunch ? (
          <div className="w-full max-w-[280px] mb-4">
            <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
            {geoLoading && ready && (
              <p className="text-xs text-slate-400 mt-2">Acquiring GPS location...</p>
            )}
          </div>
        ) : (
          <PunchToggle isPunchedIn={isPunchedIn} onToggle={onToggle} />
        )}

        {geoError && ready && !isPunchedIn && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-1">
            GPS error: {geoError}
          </p>
        )}

        {canPunch && isPunchedIn && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {syncing ? "Syncing location..." : "Location synced"}
          </p>
        )}
      </div>
    </section>
  );
}
