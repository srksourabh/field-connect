"use client";

import { useState, useCallback, useEffect } from "react";
import { ChevronLeft, Download, Eye, Loader2, Search } from "lucide-react";
import Link from "next/link";
import ReportCriteriaCard from "@/components/reports/ReportCriteriaCard";
import DataFiltersCard from "@/components/reports/DataFiltersCard";
import DataPreviewTable from "@/components/reports/DataPreviewTable";
import { exportToCsv } from "@/lib/csv-export";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toISTDateStr, todayIST } from "@/lib/utils";

type ReportType = "attendance" | "monthly" | "employee" | "project";
type ReportStatus = "present" | "absent" | "late" | "half-day" | "on-leave" | "holiday" | "lwp";

interface ReportRow {
  name: string;
  date: string;
  punchIn: string;
  punchOut: string;
  hours: string;
  status: ReportStatus;
}

interface MonthlySummaryRow {
  name: string;
  daysPresent: number;
  daysAbsent: number;
  lateDays: number;
  leaveDays: number;
  totalHours: string;
  avgHoursPerDay: string;
}

interface EmployeeOption {
  id: string;
  full_name: string;
}

function formatTime(iso: string | null): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
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
  const d = new Date(iso + "T00:00:00+05:30");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" });
}

const reportTabs: { key: ReportType; label: string }[] = [
  { key: "attendance", label: "Attendance" },
  { key: "monthly", label: "Monthly Summary" },
  { key: "employee", label: "Employee" },
  { key: "project", label: "Project Summary" },
];

export default function ReportsPage() {
  const { profile } = useAuth();
  const today = todayIST();
  const firstOfMonth = today.slice(0, 8) + "01";

  const [reportType, setReportType] = useState<ReportType>("attendance");
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [project, setProject] = useState("");
  const [department, setDepartment] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7)); // YYYY-MM
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  // Results
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [summaryRows, setSummaryRows] = useState<MonthlySummaryRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch employee list for employee report
  useEffect(() => {
    async function fetchEmployees() {
      const { data } = await supabase
        .from("hr_profiles")
        .select("id, full_name")
        .is("deactivated_at", null)
        .order("full_name")
        .limit(500);
      setEmployees(data || []);
    }
    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter((e) =>
    e.full_name.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  // Core data fetcher — returns raw grouped day-level records
  const fetchAttendanceData = useCallback(async (
    filterProject: string,
    filterDepartment: string,
    dateStart: string,
    dateEnd: string,
    filterUserId?: string
  ) => {
    let profileQuery = supabase.from("hr_profiles").select("id, full_name, project_id, department");
    if (filterProject) profileQuery = profileQuery.eq("project_id", filterProject);
    if (filterDepartment) profileQuery = profileQuery.eq("department", filterDepartment);
    if (filterUserId) profileQuery = profileQuery.eq("id", filterUserId);
    const { data: profiles } = await profileQuery;

    if (!profiles || profiles.length === 0) return [];

    const profileMap = new Map<string, string>();
    for (const p of profiles) profileMap.set(p.id, p.full_name);
    const userIds = profiles.map((p) => p.id);

    const startIso = dateStart + "T00:00:00+05:30";
    const endIso = dateEnd + "T23:59:59+05:30";

    const { data: attendance } = await supabase
      .from("hr_attendance")
      .select("user_id, punch_in_at, punch_out_at, status, created_at")
      .in("user_id", userIds)
      .gte("punch_in_at", startIso)
      .lte("punch_in_at", endIso)
      .order("punch_in_at", { ascending: true });

    const { data: leaveAttendance } = await supabase
      .from("hr_attendance")
      .select("user_id, punch_in_at, punch_out_at, status, created_at")
      .in("user_id", userIds)
      .in("status", ["on-leave", "holiday"])
      .gte("created_at", startIso)
      .lte("created_at", endIso);

    const allRecords = [...(attendance || []), ...(leaveAttendance || [])];
    const seen = new Set<string>();
    const deduped = allRecords.filter((r) => {
      const key = `${r.user_id}_${r.punch_in_at || r.created_at}_${r.status}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Group by user+date
    const dayMap = new Map<string, { user_id: string; date: string; firstIn: string | null; lastOut: string | null; status: string }>();

    for (const rec of deduped) {
      const ts = rec.punch_in_at || rec.created_at;
      const dateStr = ts ? toISTDateStr(new Date(ts)) : "";
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
        if (rec.punch_in_at && (!existing.firstIn || rec.punch_in_at < existing.firstIn)) existing.firstIn = rec.punch_in_at;
        if (rec.punch_out_at && (!existing.lastOut || rec.punch_out_at > existing.lastOut)) existing.lastOut = rec.punch_out_at;
        if (rec.status === "on-leave" || rec.status === "holiday") existing.status = rec.status;
        else if (rec.status === "late" && existing.status !== "on-leave" && existing.status !== "holiday") existing.status = "late";
      }
    }

    return Array.from(dayMap.values()).map((entry) => ({
      ...entry,
      name: profileMap.get(entry.user_id) || "Unknown",
      ms: entry.firstIn && entry.lastOut
        ? new Date(entry.lastOut).getTime() - new Date(entry.firstIn).getTime()
        : 0,
    }));
  }, []);

  // Attendance Report (original behavior)
  const fetchAttendanceReport = useCallback(async (): Promise<ReportRow[]> => {
    const data = await fetchAttendanceData(project, department, startDate, endDate);
    const validStatuses: ReportStatus[] = ["present", "absent", "late", "half-day", "on-leave", "holiday", "lwp"];
    return data.map((entry) => ({
      name: entry.name,
      date: formatDate(entry.date),
      punchIn: formatTime(entry.firstIn),
      punchOut: formatTime(entry.lastOut),
      hours: formatHours(entry.ms),
      status: validStatuses.includes(entry.status as ReportStatus) ? (entry.status as ReportStatus) : "present",
    }));
  }, [fetchAttendanceData, project, department, startDate, endDate]);

  // Monthly Summary
  const fetchMonthlySummary = useCallback(async (): Promise<MonthlySummaryRow[]> => {
    const [year, month] = selectedMonth.split("-");
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const mStart = `${selectedMonth}-01`;
    const mEnd = `${selectedMonth}-${String(daysInMonth).padStart(2, "0")}`;

    const data = await fetchAttendanceData(project, department, mStart, mEnd);

    // Group by user
    const userMap = new Map<string, { name: string; entries: typeof data }>();
    for (const entry of data) {
      const existing = userMap.get(entry.user_id);
      if (!existing) {
        userMap.set(entry.user_id, { name: entry.name, entries: [entry] });
      } else {
        existing.entries.push(entry);
      }
    }

    return Array.from(userMap.values()).map(({ name, entries }) => {
      const daysPresent = entries.filter((e) => ["present", "late", "half-day"].includes(e.status)).length;
      const lateDays = entries.filter((e) => e.status === "late").length;
      const leaveDays = entries.filter((e) => e.status === "on-leave").length;
      const totalMs = entries.reduce((sum, e) => sum + e.ms, 0);
      const daysAbsent = daysInMonth - daysPresent - leaveDays;

      return {
        name,
        daysPresent,
        daysAbsent: Math.max(0, daysAbsent),
        lateDays,
        leaveDays,
        totalHours: formatHours(totalMs),
        avgHoursPerDay: daysPresent > 0 ? formatHours(totalMs / daysPresent) : "0h",
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [fetchAttendanceData, project, department, selectedMonth]);

  // Employee Report
  const fetchEmployeeReport = useCallback(async (): Promise<ReportRow[]> => {
    if (!selectedEmployee) return [];
    const data = await fetchAttendanceData("", "", startDate, endDate, selectedEmployee);
    const validStatuses: ReportStatus[] = ["present", "absent", "late", "half-day", "on-leave", "holiday", "lwp"];
    return data.map((entry) => ({
      name: entry.name,
      date: formatDate(entry.date),
      punchIn: formatTime(entry.firstIn),
      punchOut: formatTime(entry.lastOut),
      hours: formatHours(entry.ms),
      status: validStatuses.includes(entry.status as ReportStatus) ? (entry.status as ReportStatus) : "present",
    }));
  }, [fetchAttendanceData, startDate, endDate, selectedEmployee]);

  // Project Summary — per-employee summary grouped by project
  const fetchProjectSummary = useCallback(async (): Promise<MonthlySummaryRow[]> => {
    if (!project) return [];
    const data = await fetchAttendanceData(project, "", startDate, endDate);

    const userMap = new Map<string, { name: string; entries: typeof data }>();
    for (const entry of data) {
      const existing = userMap.get(entry.user_id);
      if (!existing) {
        userMap.set(entry.user_id, { name: entry.name, entries: [entry] });
      } else {
        existing.entries.push(entry);
      }
    }

    // Count total working days in range
    const start = new Date(startDate + "T00:00:00+05:30");
    const end = new Date(endDate + "T00:00:00+05:30");
    let workingDays = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 0) workingDays++; // Exclude Sundays
      cur.setDate(cur.getDate() + 1);
    }

    return Array.from(userMap.values()).map(({ name, entries }) => {
      const daysPresent = entries.filter((e) => ["present", "late", "half-day"].includes(e.status)).length;
      const lateDays = entries.filter((e) => e.status === "late").length;
      const leaveDays = entries.filter((e) => e.status === "on-leave").length;
      const totalMs = entries.reduce((sum, e) => sum + e.ms, 0);
      const daysAbsent = workingDays - daysPresent - leaveDays;

      return {
        name,
        daysPresent,
        daysAbsent: Math.max(0, daysAbsent),
        lateDays,
        leaveDays,
        totalHours: formatHours(totalMs),
        avgHoursPerDay: daysPresent > 0 ? formatHours(totalMs / daysPresent) : "0h",
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [fetchAttendanceData, project, startDate, endDate]);

  // Generate report
  const handlePreview = async () => {
    setLoading(true);
    setShowPreview(false);
    try {
      if (reportType === "attendance") {
        const result = await fetchAttendanceReport();
        setRows(result);
        setSummaryRows([]);
        setTotalCount(result.length);
      } else if (reportType === "monthly") {
        const result = await fetchMonthlySummary();
        setSummaryRows(result);
        setRows([]);
        setTotalCount(result.length);
      } else if (reportType === "employee") {
        const result = await fetchEmployeeReport();
        setRows(result);
        setSummaryRows([]);
        setTotalCount(result.length);
      } else if (reportType === "project") {
        const result = await fetchProjectSummary();
        setSummaryRows(result);
        setRows([]);
        setTotalCount(result.length);
      }
      setShowPreview(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      if (reportType === "attendance" || reportType === "employee") {
        const result = reportType === "attendance" ? await fetchAttendanceReport() : await fetchEmployeeReport();
        setRows(result);
        setTotalCount(result.length);
        setShowPreview(true);
        exportToCsv(
          `${reportType}-report-${startDate}-to-${endDate}.csv`,
          ["Employee", "Date", "Punch In", "Punch Out", "Hours", "Status"],
          result.map((r) => [r.name, r.date, r.punchIn, r.punchOut, r.hours, r.status])
        );
      } else {
        const result = reportType === "monthly" ? await fetchMonthlySummary() : await fetchProjectSummary();
        setSummaryRows(result);
        setTotalCount(result.length);
        setShowPreview(true);
        const label = reportType === "monthly" ? `monthly-summary-${selectedMonth}` : `project-summary-${startDate}-to-${endDate}`;
        exportToCsv(
          `${label}.csv`,
          ["Employee", "Days Present", "Days Absent", "Late Days", "Leave Days", "Total Hours", "Avg Hours/Day"],
          result.map((r) => [r.name, String(r.daysPresent), String(r.daysAbsent), String(r.lateDays), String(r.leaveDays), r.totalHours, r.avgHoursPerDay])
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Guard
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
        <h1 className="text-lg font-semibold text-center flex-1">Reports</h1>
        <div className="w-9" />
      </header>

      {/* Report Type Tabs */}
      <div className="px-4 pt-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max">
          {reportTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setReportType(tab.key); setShowPreview(false); }}
              className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                reportType === tab.key
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-4">
        {/* Date inputs — different for monthly vs others */}
        {reportType === "monthly" ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Select Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="uds-input text-sm dark:[color-scheme:dark]"
            />
          </div>
        ) : (
          <ReportCriteriaCard
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
        )}

        {/* Filters — different per type */}
        {reportType === "employee" ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Select Employee</label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Search employees..."
                className="uds-input pl-10 text-sm"
              />
            </div>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="uds-input text-sm"
              size={5}
            >
              <option value="">-- Select --</option>
              {filteredEmployees.map((e) => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </div>
        ) : (
          <DataFiltersCard
            project={project}
            department={department}
            onProjectChange={setProject}
            onDepartmentChange={setDepartment}
          />
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handlePreview}
            disabled={loading || (reportType === "employee" && !selectedEmployee) || (reportType === "project" && !project)}
            className="uds-btn-secondary"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            {loading ? "Loading..." : "Preview"}
          </button>
          <button
            onClick={handleDownload}
            disabled={loading || (reportType === "employee" && !selectedEmployee) || (reportType === "project" && !project)}
            className="uds-btn-primary"
          >
            <Download className="w-4 h-4" /> Download CSV
          </button>
        </div>

        {/* Preview */}
        {showPreview && (
          <>
            {/* Attendance/Employee detail table */}
            {(reportType === "attendance" || reportType === "employee") && (
              rows.length > 0 ? (
                <DataPreviewTable rows={rows} total={totalCount} />
              ) : (
                <div className="text-center py-8 text-sm text-gray-400">
                  No attendance records found for the selected range.
                </div>
              )
            )}

            {/* Monthly/Project summary table */}
            {(reportType === "monthly" || reportType === "project") && (
              summaryRows.length > 0 ? (
                <SummaryTable rows={summaryRows} total={totalCount} />
              ) : (
                <div className="text-center py-8 text-sm text-gray-400">
                  No data found for the selected criteria.
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SummaryTable({ rows, total }: { rows: MonthlySummaryRow[]; total: number }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700/50">
        <h3 className="text-sm font-semibold">Summary</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
          {rows.length} of {total}
        </span>
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-900 text-xs text-gray-500 dark:text-gray-400">
              <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Employee</th>
              <th className="text-center py-3 px-3 font-medium whitespace-nowrap">Present</th>
              <th className="text-center py-3 px-3 font-medium whitespace-nowrap">Absent</th>
              <th className="text-center py-3 px-3 font-medium whitespace-nowrap">Late</th>
              <th className="text-center py-3 px-3 font-medium whitespace-nowrap">Leave</th>
              <th className="text-left py-3 px-3 font-medium whitespace-nowrap">Total Hrs</th>
              <th className="text-left py-3 px-3 font-medium whitespace-nowrap">Avg/Day</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="py-3 px-4 font-medium whitespace-nowrap">{row.name}</td>
                <td className="py-3 px-3 text-center text-green-600">{row.daysPresent}</td>
                <td className="py-3 px-3 text-center text-red-500">{row.daysAbsent}</td>
                <td className="py-3 px-3 text-center text-amber-500">{row.lateDays}</td>
                <td className="py-3 px-3 text-center text-blue-500">{row.leaveDays}</td>
                <td className="py-3 px-3 whitespace-nowrap">{row.totalHours}</td>
                <td className="py-3 px-3 whitespace-nowrap">{row.avgHoursPerDay}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
