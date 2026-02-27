"use client";

import { MapPin, RefreshCw, Crosshair } from "lucide-react";

interface LocationWidgetProps {
  address: string | null;
  loading: boolean;
  onRefresh: () => void;
}

export default function LocationWidget({ address, loading, onRefresh }: LocationWidgetProps) {
  return (
    <section className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Current Location
        </h3>
        <button
          onClick={onRefresh}
          className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
      <div className="relative h-32 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50">
        {/* Map placeholder background */}
        <div className="absolute inset-0 bg-slate-800 opacity-60" />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark/80 via-transparent to-transparent" />
        {/* Pin */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <MapPin className="w-10 h-10 text-primary drop-shadow-lg" />
        </div>
        {/* Address bar */}
        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
          <div>
            <p className="text-xs text-white/70 font-medium">Near</p>
            <p className="text-sm text-white font-semibold truncate w-48">
              {loading ? "Fetching location..." : address || "Location unavailable"}
            </p>
          </div>
          <div className="bg-surface-dark/80 backdrop-blur-md p-1.5 rounded-lg border border-white/10">
            <Crosshair className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </section>
  );
}
