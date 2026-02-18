"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, FileEdit } from "lucide-react";
import Link from "next/link";
import AttendanceCalendar from "@/components/attendance/AttendanceCalendar";
import DaySummary from "@/components/attendance/DaySummary";
import AttendanceTimeline from "@/components/attendance/AttendanceTimeline";
import { useAuth } from "@/lib/auth";
import { getAttendanceByMonth } from "@/lib/attendance-api";
import { cacheSet, cacheGet } from "@/lib/offline-cache";
import type { HrAttendance } from "@/lib/database.types";
import { formatTime, toISTDateStr } from "@/lib/utils";

export default function AttendancePage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [records, setRecords] = useState<HrAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [cachedAt, setCachedAt] = useState<number | null>(null);

  const fetchMonth = useCallback(
    async (year: number, month: number) => {
      if (!user) return;
      setLoading(true);
      setCachedAt(null);

      // Restore cached data immediately
      const cacheKey = `attendance_${year}_${month}`;
      const cached = cacheGet<HrAttendance[]>(user.id, cacheKey);
      if (cached) {
        setRecords(cached.data);
        setCachedAt(cached.updatedAt);
        setLoading(false);
      }

      try {
        const data = await getAttendanceByMonth(user.id, year, month);
        setRecords(data);
        cacheSet(user.id, cacheKey, data);
        setCachedAt(null); // Fresh data — no need to show timestamp
      } catch {
        // Offline — cached data already loaded above
      }
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

  // Helper: use punch_in_at for date (falls back to created_at for on-leave/holiday records)
  const recordDate = (r: HrAttendance) =>
    toISTDateStr(new Date(r.punch_in_at || r.created_at));

  // Transform records → calendar format (deduplicate per date, keep worst status)
  const calendarRecords = useMemo(() => {
    const dateMap = new Map<string, string>();
    for (const r of records) {
      const date = recordDate(r);
      const existing = dateMap.get(date);
      // Keep the first status encountered (records are ordered ascending)
      if (!existing) dateMap.set(date, r.status);
    }
    return Array.from(dateMap.entries()).map(([date, status]) => ({
      date,
      status: status as "present" | "absent" | "late" | "half-day" | "on-leave" | "holiday" | "lwp",
    }));
  }, [records]);

  // Find ALL records for the selected day (multiple sessions)
  const dateStr = toISTDateStr(selectedDate);
  const selectedRecords = useMemo(
    () => records.filter((r) => recordDate(r) === dateStr),
    [records, dateStr]
  );
  const calendarEntry = calendarRecords.find((r) => r.date === dateStr);

  // Compute total hours from ALL sessions
  const totalHours = useMemo(() => {
    let totalMs = 0;
    for (const rec of selectedRecords) {
      if (!rec.punch_in_at) continue;
      const pIn = new Date(rec.punch_in_at);
      const pOut = rec.punch_out_at ? new Date(rec.punch_out_at) : new Date();
      totalMs += pOut.getTime() - pIn.getTime();
    }
    if (totalMs <= 0) return "0h 0m";
    const h = Math.floor(totalMs / 3600000);
    const m = Math.floor((totalMs % 3600000) / 60000);
    return `${h}h ${m}m`;
  }, [selectedRecords]);

  // Build timeline from ALL sessions with session duration
  const timeline = useMemo(() => {
    const events: { type: "punch_in" | "punch_out"; time: string; location?: string; synced: boolean; autoClose?: boolean; sessionDuration?: string }[] = [];
    for (const rec of selectedRecords) {
      if (rec.punch_in_at) {
        events.push({
          type: "punch_in",
          time: formatTime(new Date(rec.punch_in_at)),
          synced: rec.synced,
        });
      }
      if (rec.punch_out_at) {
        const pOutDate = new Date(rec.punch_out_at);
        const istTime = pOutDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
        const isAutoClose = istTime === "23:59";
        // Calculate session duration
        let sessionDuration: string | undefined;
        if (rec.punch_in_at) {
          const durMs = pOutDate.getTime() - new Date(rec.punch_in_at).getTime();
          const sh = Math.floor(durMs / 3600000);
          const sm = Math.floor((durMs % 3600000) / 60000);
          sessionDuration = `${sh}h ${sm}m active`;
        }
        events.push({
          type: "punch_out",
          time: formatTime(pOutDate),
          synced: rec.synced,
          autoClose: isAutoClose,
          sessionDuration,
        });
      }
    }
    return events;
  }, [selectedRecords]);

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

      {/* Cached data indicator */}
      {cachedAt && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-1">
          Last updated: {new Date(cachedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
        </p>
      )}

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

            {/* Request Rectification — only for non-weekend working days (not on-leave/holiday) */}
            {!isWeekend && calendarEntry && !["on-leave", "holiday"].includes(calendarEntry.status) && (
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
