"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, Download, Eye, Loader2 } from "lucide-react";
import Link from "next/link";
import ReportCriteriaCard from "@/components/reports/ReportCriteriaCard";
import DataFiltersCard from "@/components/reports/DataFiltersCard";
import DataPreviewTable from "@/components/reports/DataPreviewTable";
import { exportToCsv } from "@/lib/csv-export";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toISTDateStr, todayIST } from "@/lib/utils";

type ReportStatus = "present" | "absent" | "late" | "half-day" | "on-leave" | "holiday" | "lwp";

interface ReportRow {
  name: string;
  date: string;
  punchIn: string;
  punchOut: string;
  hours: string;
  status: ReportStatus;
}

function formatTime(iso: string | null): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatHours(ms: number): string {
  if (ms <= 0) return "0h";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function ReportsPage() {
  const { profile } = useAuth();
  const today = todayIST();
  const firstOfMonth = today.slice(0, 8) + "01";

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [project, setProject] = useState("");
  const [department, setDepartment] = useState("");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);

    // Fetch profiles (for name, project, department mapping)
    let profileQuery = supabase.from("hr_profiles").select("id, full_name, project_id, department");
    if (project) profileQuery = profileQuery.eq("project_id", project);
    if (department) profileQuery = profileQuery.eq("department", department);
    const { data: profiles } = await profileQuery;

    if (!profiles || profiles.length === 0) {
      setRows([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    const profileMap = new Map<string, string>();
    for (const p of profiles) {
      profileMap.set(p.id, p.full_name);
    }
    const userIds = profiles.map((p) => p.id);

    // Fetch attendance for the date range
    // punch_in_at is an ISO timestamp — filter by date range
    const startIso = startDate + "T00:00:00+05:30";
    const endIso = endDate + "T23:59:59+05:30";

    const { data: attendance } = await supabase
      .from("hr_attendance")
      .select("user_id, punch_in_at, punch_out_at, status")
      .in("user_id", userIds)
      .gte("punch_in_at", startIso)
      .lte("punch_in_at", endIso)
      .order("punch_in_at", { ascending: true });

    if (!attendance || attendance.length === 0) {
      setRows([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    // Group by user+date, take first punch-in and last punch-out per day
    const dayMap = new Map<string, { user_id: string; date: string; firstIn: string | null; lastOut: string | null; status: string }>();

    for (const rec of attendance) {
      const dateStr = rec.punch_in_at ? toISTDateStr(new Date(rec.punch_in_at)) : "";
      if (!dateStr) continue;
      const key = `${rec.user_id}_${dateStr}`;
      const existing = dayMap.get(key);
      if (!existing) {
        dayMap.set(key, {
          user_id: rec.user_id,
          date: dateStr,
          firstIn: rec.punch_in_at,
          lastOut: rec.punch_out_at,
          status: rec.status || "present",
        });
      } else {
        // Keep earliest punch-in
        if (rec.punch_in_at && (!existing.firstIn || rec.punch_in_at < existing.firstIn)) {
          existing.firstIn = rec.punch_in_at;
        }
        // Keep latest punch-out
        if (rec.punch_out_at && (!existing.lastOut || rec.punch_out_at > existing.lastOut)) {
          existing.lastOut = rec.punch_out_at;
        }
        // If any session is "late", mark the day as late
        if (rec.status === "late") existing.status = "late";
      }
    }

    const result: ReportRow[] = [];
    for (const entry of Array.from(dayMap.values())) {
      const ms =
        entry.firstIn && entry.lastOut
          ? new Date(entry.lastOut).getTime() - new Date(entry.firstIn).getTime()
          : 0;

      const validStatuses: ReportStatus[] = ["present", "absent", "late", "half-day", "on-leave", "holiday", "lwp"];
      const status: ReportStatus = validStatuses.includes(entry.status as ReportStatus)
        ? (entry.status as ReportStatus)
        : "present";

      result.push({
        name: profileMap.get(entry.user_id) || "Unknown",
        date: formatDate(entry.date),
        punchIn: formatTime(entry.firstIn),
        punchOut: formatTime(entry.lastOut),
        hours: formatHours(ms),
        status,
      });
    }

    setTotalCount(result.length);
    setRows(result);
    setShowPreview(true);
    setLoading(false);
  }, [startDate, endDate, project, department]);

  const handleDownload = async () => {
    // Always fetch fresh data and export from the fetched result
    setLoading(true);
    try {
      let profileQuery = supabase.from("hr_profiles").select("id, full_name, project_id, department");
      if (project) profileQuery = profileQuery.eq("project_id", project);
      if (department) profileQuery = profileQuery.eq("department", department);
      const { data: profiles } = await profileQuery;

      if (!profiles || profiles.length === 0) {
        setRows([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      const profileMap = new Map<string, string>();
      for (const p of profiles) profileMap.set(p.id, p.full_name);
      const userIds = profiles.map((p) => p.id);

      const startIso = startDate + "T00:00:00+05:30";
      const endIso = endDate + "T23:59:59+05:30";

      const { data: attendance } = await supabase
        .from("hr_attendance")
        .select("user_id, punch_in_at, punch_out_at, status")
        .in("user_id", userIds)
        .gte("punch_in_at", startIso)
        .lte("punch_in_at", endIso)
        .order("punch_in_at", { ascending: true });

      if (!attendance || attendance.length === 0) {
        setRows([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      const dayMap = new Map<string, { user_id: string; date: string; firstIn: string | null; lastOut: string | null; status: string }>();
      for (const rec of attendance) {
        const dateStr = rec.punch_in_at ? toISTDateStr(new Date(rec.punch_in_at)) : "";
        if (!dateStr) continue;
        const key = `${rec.user_id}_${dateStr}`;
        const existing = dayMap.get(key);
        if (!existing) {
          dayMap.set(key, { user_id: rec.user_id, date: dateStr, firstIn: rec.punch_in_at, lastOut: rec.punch_out_at, status: rec.status || "present" });
        } else {
          if (rec.punch_in_at && (!existing.firstIn || rec.punch_in_at < existing.firstIn)) existing.firstIn = rec.punch_in_at;
          if (rec.punch_out_at && (!existing.lastOut || rec.punch_out_at > existing.lastOut)) existing.lastOut = rec.punch_out_at;
          if (rec.status === "late") existing.status = "late";
        }
      }

      const validStatuses: ReportStatus[] = ["present", "absent", "late", "half-day", "on-leave", "holiday", "lwp"];
      const exportRows: ReportRow[] = [];
      for (const entry of Array.from(dayMap.values())) {
        const ms = entry.firstIn && entry.lastOut ? new Date(entry.lastOut).getTime() - new Date(entry.firstIn).getTime() : 0;
        const status: ReportStatus = validStatuses.includes(entry.status as ReportStatus) ? (entry.status as ReportStatus) : "present";
        exportRows.push({
          name: profileMap.get(entry.user_id) || "Unknown",
          date: formatDate(entry.date),
          punchIn: formatTime(entry.firstIn),
          punchOut: formatTime(entry.lastOut),
          hours: formatHours(ms),
          status,
        });
      }

      setRows(exportRows);
      setTotalCount(exportRows.length);
      setShowPreview(true);

      exportToCsv(
        `attendance-report-${startDate}-to-${endDate}.csv`,
        ["Employee", "Date", "Punch In", "Punch Out", "Hours", "Status"],
        exportRows.map((r) => [r.name, r.date, r.punchIn, r.punchOut, r.hours, r.status])
      );
    } finally {
      setLoading(false);
    }
  };

  // Only admins/managers should access reports
  if (profile && profile.role === "employee") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <h1 className="text-lg font-semibold mb-2">Access Denied</h1>
        <p className="text-sm text-gray-500 text-center mb-4">
          Only admins and managers can access reports.
        </p>
        <Link href="/dashboard" className="text-primary text-sm font-medium">
          Back to Dashboard
        </Link>
      </div>
    );
  }

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
          Generate Report
        </h1>
        <div className="w-9" />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-6 space-y-4">
        <ReportCriteriaCard
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
        <DataFiltersCard
          project={project}
          department={department}
          onProjectChange={setProject}
          onDepartmentChange={setDepartment}
        />

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="uds-btn-secondary"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            {loading ? "Loading..." : "Preview"}
          </button>
          <button onClick={handleDownload} disabled={loading} className="uds-btn-primary">
            <Download className="w-4 h-4" /> Download CSV
          </button>
        </div>

        {/* Preview Table */}
        {showPreview && (
          rows.length > 0 ? (
            <DataPreviewTable rows={rows} total={totalCount} />
          ) : (
            <div className="text-center py-8 text-sm text-gray-400">
              No attendance records found for the selected range.
            </div>
          )
        )}
      </div>
    </div>
  );
}
