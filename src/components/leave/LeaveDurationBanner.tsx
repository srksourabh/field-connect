"use client";

import { differenceInCalendarDays, parseISO } from "date-fns";

interface LeaveDurationBannerProps {
  startDate: string;
  endDate: string;
}

export default function LeaveDurationBanner({ startDate, endDate }: LeaveDurationBannerProps) {
  let days = 0;
  if (startDate && endDate) {
    // Use calendar days to match leave balance deduction logic (leave-api.ts)
    days = differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1;
    if (days < 0) days = 0;
  }

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
      <span className="text-sm text-primary font-medium">Total Duration</span>
      <span className="text-sm font-bold text-gray-900 dark:text-white">
        {days} {days === 1 ? "Day" : "Days"}
      </span>
    </div>
  );
}
