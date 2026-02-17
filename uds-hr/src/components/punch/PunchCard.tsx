"use client";

import PunchTimer from "./PunchTimer";
import PunchToggle from "./PunchToggle";

interface PunchCardProps {
  isPunchedIn: boolean;
  elapsedSeconds: number;
  onToggle: () => void;
  syncing?: boolean;
}

export default function PunchCard({
  isPunchedIn,
  elapsedSeconds,
  onToggle,
  syncing = false,
}: PunchCardProps) {
  return (
    <section className="bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50 p-6 mb-6 relative overflow-hidden group">
      {/* Background glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700" />

      <div className="flex flex-col items-center text-center relative z-10">
        <h2 className="text-sm font-medium uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-6">
          Current Status
        </h2>

        <PunchTimer elapsedSeconds={elapsedSeconds} isPunchedIn={isPunchedIn} />
        <PunchToggle isPunchedIn={isPunchedIn} onToggle={onToggle} />

        {isPunchedIn && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {syncing ? "Syncing location..." : "Location synced"}
          </p>
        )}
      </div>
    </section>
  );
}
