"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { HrLocationLog } from "@/lib/database.types";

interface RouteMapModalProps {
  open: boolean;
  onClose: () => void;
  logs: HrLocationLog[];
  distanceKm: number;
}

export default function RouteMapModal({ open, onClose, logs, distanceKm }: RouteMapModalProps) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{
    logs: HrLocationLog[];
    distanceKm: number;
  }> | null>(null);

  useEffect(() => {
    if (open) {
      import("./RouteMapInner").then((mod) => setMapComponent(() => mod.default));
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-surface-dark rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700/50">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Today&apos;s Route — {distanceKm.toFixed(1)} km
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Map */}
        <div className="h-[60vh]">
          {logs.length < 2 ? (
            <div className="flex items-center justify-center h-full text-sm text-gray-400">
              Not enough GPS points to show a route
            </div>
          ) : MapComponent ? (
            <MapComponent logs={logs} distanceKm={distanceKm} />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-gray-400">
              Loading map...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
