"use client";

import { Calendar } from "lucide-react";

interface ReportCriteriaCardProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
}

export default function ReportCriteriaCard({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: ReportCriteriaCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Report Period</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Start Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="uds-input text-sm pl-10 dark:[color-scheme:dark]"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
            End Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="uds-input text-sm pl-10 dark:[color-scheme:dark]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
