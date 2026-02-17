"use client";

import { useEffect, useState } from "react";
import { MapPin, Users } from "lucide-react";
import type { MapEmployee } from "./AdminLeafletMap";

interface AdminLiveMapProps {
  employees: MapEmployee[];
  onSelectEmployee?: (id: string) => void;
}

export default function AdminLiveMap({ employees, onSelectEmployee }: AdminLiveMapProps) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{
    employees: MapEmployee[];
    onSelectEmployee?: (id: string) => void;
  }> | null>(null);

  useEffect(() => {
    import("./AdminLeafletMap").then((mod) => {
      setMapComponent(() => mod.default);
    });
  }, []);

  const onlineCount = employees.filter((e) => e.status === "online").length;

  return (
    <div className="relative h-full w-full">
      {/* Live badge */}
      <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2">
        <div className="bg-white dark:bg-surface-dark rounded-full px-3 py-1.5 shadow-lg border border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold">LIVE</span>
        </div>
        <div className="bg-white dark:bg-surface-dark rounded-full px-3 py-1.5 shadow-lg border border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">{onlineCount} Active</span>
        </div>
      </div>

      {MapComponent ? (
        <MapComponent employees={employees} onSelectEmployee={onSelectEmployee} />
      ) : (
        <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <MapPin className="w-8 h-8 mx-auto mb-2 animate-pulse" />
            <p className="text-sm">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}
