"use client";

import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncStatusBannerProps {
  isOnline: boolean;
  pendingCount: number;
}

export default function SyncStatusBanner({ isOnline, pendingCount }: SyncStatusBannerProps) {
  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={cn(
        "mb-6 flex items-center justify-center gap-2 py-1.5 px-3 rounded-full w-fit mx-auto border",
        isOnline
          ? "bg-blue-500/10 border-blue-500/20"
          : "bg-amber-500/10 border-amber-500/20"
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs font-medium text-blue-500">
            Syncing {pendingCount} pending...
          </span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-medium text-amber-500">
            Offline Mode {pendingCount > 0 ? `• ${pendingCount} Cached` : "• Data Cached"}
          </span>
        </>
      )}
    </div>
  );
}
