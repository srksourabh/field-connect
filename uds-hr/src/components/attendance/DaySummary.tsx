"use client";

import { format } from "date-fns";
import StatusBadge from "@/components/ui/StatusBadge";

interface DaySummaryProps {
  date: Date;
  status: "present" | "absent" | "late" | "half-day" | "on-leave" | "holiday" | "lwp" | null;
  totalHours: string;
}

const statusVariant: Record<string, "success" | "error" | "warning" | "info"> = {
  present: "success",
  absent: "error",
  late: "warning",
  "half-day": "warning",
  "on-leave": "info",
  holiday: "info",
  lwp: "error",
};

export default function DaySummary({ date, status, totalHours }: DaySummaryProps) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
          Selected Date
        </h3>
        <p className="text-2xl font-semibold text-slate-900 dark:text-white">
          {format(date, "EEE, MMM d")}
        </p>
      </div>
      <div className="text-right">
        {status && (
          <StatusBadge variant={statusVariant[status] || "neutral"} className="mb-1">
            {status === "on-leave" ? "On Leave" : status === "lwp" ? "LWP" : status.charAt(0).toUpperCase() + status.slice(1)}
          </StatusBadge>
        )}
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {totalHours} Worked
        </p>
      </div>
    </div>
  );
}
