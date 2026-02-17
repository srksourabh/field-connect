"use client";

import { formatDuration } from "@/lib/utils";

interface PunchTimerProps {
  elapsedSeconds: number;
  isPunchedIn: boolean;
}

export default function PunchTimer({ elapsedSeconds, isPunchedIn }: PunchTimerProps) {
  return (
    <div className="mb-8">
      <div className="text-5xl font-bold font-mono tracking-tight tabular-nums text-slate-800 dark:text-white drop-shadow-sm">
        {formatDuration(elapsedSeconds)}
      </div>
      <p className="text-sm text-primary font-medium mt-1">
        {isPunchedIn ? "Time Since Punch In" : "Not Punched In"}
      </p>
    </div>
  );
}
