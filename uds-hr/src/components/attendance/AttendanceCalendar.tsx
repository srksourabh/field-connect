"use client";

import { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type DayStatus = "present" | "absent" | "late" | "half-day" | "on-leave" | "holiday" | "lwp" | "weekend" | null;

interface AttendanceRecord {
  date: string;
  status: DayStatus;
}

interface AttendanceCalendarProps {
  records: AttendanceRecord[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onMonthChange: (year: number, month: number) => void;
}

const statusDotColor: Record<string, string> = {
  present: "bg-emerald-500",
  absent: "bg-red-500",
  late: "bg-yellow-400",
  "half-day": "bg-orange-500",
  "on-leave": "bg-red-500",
  holiday: "bg-blue-500",
  lwp: "bg-rose-400",
  weekend: "bg-gray-300 dark:bg-gray-700",
};

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function AttendanceCalendar({
  records,
  selectedDate,
  onSelectDate,
  onMonthChange,
}: AttendanceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const statusMap = useMemo(() => {
    const map = new Map<string, DayStatus>();
    records.forEach((r) => map.set(r.date, r.status));
    return map;
  }, [records]);

  const handlePrevMonth = () => {
    const prev = subMonths(currentMonth, 1);
    setCurrentMonth(prev);
    onMonthChange(prev.getFullYear(), prev.getMonth());
  };

  const handleNextMonth = () => {
    const next = addMonths(currentMonth, 1);
    setCurrentMonth(next);
    onMonthChange(next.getFullYear(), next.getMonth());
  };

  return (
    <div className="bg-white dark:bg-[#151f2b] p-6 pb-8 border-b border-gray-200 dark:border-gray-800">
      {/* Month Selector */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePrevMonth}
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <h2 className="text-xl font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <button
          onClick={handleNextMonth}
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ChevronRight className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-4 text-center">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-xs font-medium text-gray-400">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-y-6 text-center text-sm font-medium">
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const status = statusMap.get(dateKey);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = isSameDay(day, selectedDate);

          return (
            <div
              key={dateKey}
              onClick={() => isCurrentMonth && onSelectDate(day)}
              className={cn(
                "relative flex flex-col items-center justify-center cursor-pointer",
                !isCurrentMonth && "text-gray-300 dark:text-gray-600"
              )}
            >
              {isSelected && isCurrentMonth ? (
                <div className="w-8 h-8 flex items-center justify-center bg-primary rounded-full text-white shadow-lg shadow-primary/30 mb-1">
                  {format(day, "d")}
                </div>
              ) : (
                <span className="mb-1">{format(day, "d")}</span>
              )}
              {status && isCurrentMonth && (
                <span
                  className={cn("w-1.5 h-1.5 rounded-full", statusDotColor[status])}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
