"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, FileEdit } from "lucide-react";
import Link from "next/link";
import AttendanceCalendar from "@/components/attendance/AttendanceCalendar";
import DaySummary from "@/components/attendance/DaySummary";
import AttendanceTimeline from "@/components/attendance/AttendanceTimeline";
import { useAuth } from "@/lib/auth";
import { getAttendanceByMonth } from "@/lib/attendance-api";
import type { HrAttendance } from "@/lib/database.types";
import { formatTime, toISTDateStr } from "@/lib/utils";

export default function AttendancePage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [records, setRecords] = useState<HrAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMonth = useCallback(
    async (year: number, month: number) => {
      if (!user) return;
      setLoading(true);
      const data = await getAttendanceByMonth(user.id, year, month);
      setRecords(data);
      setLoading(false);
    },
    [user]
  );

  // Fetch current month on mount
  useEffect(() => {
    const now = new Date();
    fetchMonth(now.getFullYear(), now.getMonth());
  }, [fetchMonth]);

  const handleMonthChange = (year: number, month: number) => {
    fetchMonth(year, month);
  };

  // Transform records → calendar format
  const calendarRecords = useMemo(() => {
    return records.map((r) => {
      const date = toISTDateStr(new Date(r.created_at));
      return { date, status: r.status as "present" | "absent" | "late" | "half-day" | "on-leave" | "holiday" | "lwp" };
    });
  }, [records]);

  // Find selected day's record
  const dateStr = toISTDateStr(selectedDate);
  const selectedRecord = records.find(
    (r) => toISTDateStr(new Date(r.created_at)) === dateStr
  );
  const calendarEntry = calendarRecords.find((r) => r.date === dateStr);

  // Compute total hours from timestamps
  const totalHours = useMemo(() => {
    if (!selectedRecord?.punch_in_at) return "0h 0m";
    const pIn = new Date(selectedRecord.punch_in_at);
    const pOut = selectedRecord.punch_out_at
      ? new Date(selectedRecord.punch_out_at)
      : new Date();
    const diffMs = pOut.getTime() - pIn.getTime();
    const h = Math.floor(diffMs / 3600000);
    const m = Math.floor((diffMs % 3600000) / 60000);
    return `${h}h ${m}m`;
  }, [selectedRecord]);

  // Build timeline from record
  const timeline = useMemo(() => {
    if (!selectedRecord) return [];
    const events: { type: "punch_in" | "punch_out"; time: string; location?: string; synced: boolean; autoClose?: boolean }[] = [];
    if (selectedRecord.punch_in_at) {
      events.push({
        type: "punch_in",
        time: formatTime(new Date(selectedRecord.punch_in_at)),
        synced: selectedRecord.synced,
      });
    }
    if (selectedRecord.punch_out_at) {
      // Detect auto-close: punch_out_at ends at 23:59 IST
      const pOutDate = new Date(selectedRecord.punch_out_at);
      const istTime = pOutDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
      const isAutoClose = istTime === "23:59";
      events.push({
        type: "punch_out",
        time: formatTime(pOutDate),
        synced: selectedRecord.synced,
        autoClose: isAutoClose,
      });
    }
    return events;
  }, [selectedRecord]);

  const isWeekend =
    selectedDate.getDay() === 0 || selectedDate.getDay() === 6;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link
          href="/dashboard"
          className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-lg font-semibold text-center flex-1">
          Attendance History
        </h1>
        <button
          onClick={() => setSelectedDate(new Date())}
          className="text-primary font-medium text-sm hover:text-primary/80 transition-colors"
        >
          Today
        </button>
      </header>

      {/* Calendar */}
      <AttendanceCalendar
        records={calendarRecords}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onMonthChange={handleMonthChange}
      />

      {/* Day Summary & Timeline */}
      <div className="p-6">
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
        ) : (
          <>
            <DaySummary
              date={selectedDate}
              status={
                isWeekend
                  ? null
                  : calendarEntry?.status ?? null
              }
              totalHours={totalHours}
            />
            <AttendanceTimeline events={timeline} />

            {/* Request Rectification — only for non-weekend days with records */}
            {!isWeekend && calendarEntry && (
              <Link
                href="/dashboard/attendance/rectification"
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 active:scale-[0.98] transition-all"
              >
                <FileEdit className="w-4 h-4" />
                Request Rectification
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
