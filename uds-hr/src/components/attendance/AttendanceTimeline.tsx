"use client";

import { MapPin, CloudOff, Check } from "lucide-react";

interface TimelineEvent {
  type: "punch_in" | "punch_out" | "break_start" | "break_end";
  time: string;
  location?: string;
  synced: boolean;
}

interface AttendanceTimelineProps {
  events: TimelineEvent[];
}

const typeLabels: Record<string, { label: string; color: string }> = {
  punch_in: { label: "Punch In", color: "text-primary" },
  punch_out: { label: "Punch Out", color: "text-primary" },
  break_start: { label: "Break Start", color: "text-gray-500 dark:text-gray-400" },
  break_end: { label: "Break End", color: "text-gray-500 dark:text-gray-400" },
};

export default function AttendanceTimeline({ events }: AttendanceTimelineProps) {
  return (
    <div className="relative pl-4 border-l-2 border-gray-200 dark:border-gray-800 space-y-8">
      {events.map((event, idx) => {
        const config = typeLabels[event.type];
        const isPrimary = event.type === "punch_in" || event.type === "punch_out";

        return (
          <div key={idx} className="relative">
            {/* Dot */}
            <div
              className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full ring-4 ring-white dark:ring-background-dark ${
                isPrimary ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
              }`}
            />
            {/* Content Card */}
            <div
              className={`bg-white dark:bg-[#151f2b] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 ${
                !isPrimary ? "opacity-80" : ""
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p
                    className={`text-xs font-medium uppercase tracking-wider mb-0.5 ${config.color}`}
                  >
                    {config.label}
                  </p>
                  <h4 className="text-lg font-bold">{event.time}</h4>
                </div>
                {event.synced ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <div className="flex items-center gap-1 text-yellow-500">
                    <span className="text-[10px] font-medium uppercase">Pending</span>
                    <CloudOff className="w-4 h-4" />
                  </div>
                )}
              </div>
              {event.location && (
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
