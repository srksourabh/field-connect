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
import { showToast } from "@/components/ui/Toast";
import { toISTDateStr, todayIST } from "@/lib/utils";

type ReportType = "attendance" | "monthly" | "employee" | "project" | "leave" | "not_present";
type ReportStatus = "present" | "absent" | "late" | "half-day" | "on-leave" | "holiday" | "lwp";

interface ReportRow {
  name: string;
  date: string;
  punchIn: string;
  punchOut: string;
  hours: string;
  status: ReportStatus;
  distanceKm?: string;
}

interface MonthlySummaryRow {
  name: string;
  daysPresent: number;
  daysAbsent: number;
  lateDays: number;
  leaveDays: number;
  totalHours: string;
  avgHoursPerDay: string;
  totalDistanceKm: string;
}

interface EmployeeOption {
  id: string;
  full_name: string;
}

interface MonthlyGridRow {
  name: string;
  project: string;
  userId: string;
  days: Record<number, { status: string; punchIn: string | null; punchOut: string | null; hours: string }>;
  totalPresent: number;
  totalAbsent: number;
  totalLeave: number;
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

interface LeaveReportRow {
  name: string;
  project: string;
  department: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
}

interface NotPresentRow {
  name: string;
  designation: string;
  state: string;
  project: string;
  reportingManager: string;
  reason: string; // "absent" | "on-leave" | "half-day"
}

const reportTabs: { key: ReportType; label: string }[] = [
  { key: "not_present", label: "Not Present Today" },
  { key: "attendance", label: "Attendance" },
  { key: "monthly", label: "Monthly Summary" },
  { key: "employee", label: "Employee" },
  { key: "project", label: "Project Summary" },
  { key: "leave", label: "Leave Report" },
];

export default function ReportsPage() {
  const { profile, session } = useAuth();
  const today = todayIST();
  const firstOfMonth = today.slice(0, 8) + "01";

  const [reportType, setReportType] = useState<ReportType>("not_present");
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
  const [leaveRows, setLeaveRows] = useState<LeaveReportRow[]>([]);
  const [notPresentRows, setNotPresentRows] = useState<NotPresentRow[]>([]);
  const [monthlyGrid, setMonthlyGrid] = useState<MonthlyGridRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [dayDetail, setDayDetail] = useState<{ name: string; date: string; rawDate: string; userId: string; punchIn: string; punchOut: string; hours: string; status: string } | null>(null);
  const [overrideStatus, setOverrideStatus] = useState("");
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch employee list scoped by user's role/project
  useEffect(() => {
    async function fetchEmployees() {
      let query = supabase
        .from("hr_profiles")
        .select("id, full_name, project_id")
        .is("deactivated_at", null)
        .order("full_name")
        .limit(500);

      // Scope to admin's project unless super_admin/HR
      const isUniversal =
        profile?.role === "super_admin" ||
        (profile?.designation?.toLowerCase().includes("hr") &&
          ["admin", "super_admin"].includes(profile?.role || ""));

      if (!isUniversal && profile?.project_id) {
        query = query.eq("project_id", profile.project_id);
      }

      const { data } = await query;
      setEmployees(data || []);
    }
    if (profile) fetchEmployees();
  }, [profile]);

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

    // Fetch in batches of 50 user IDs to avoid URL length limits
    // and use higher row limits to get full month data
    const batchSize = 50;
    type AttendanceRec = { user_id: string; punch_in_at: string | null; punch_out_at: string | null; status: string; created_at: string; total_distance_km: number | null };
    const allRecords: AttendanceRec[] = [];

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);

      const [{ data: attendance }, { data: leaveAttendance }] = await Promise.all([
        supabase
          .from("hr_attendance")
          .select("user_id, punch_in_at, punch_out_at, status, created_at, total_distance_km")
          .in("user_id", batch)
          .gte("punch_in_at", startIso)
          .lte("punch_in_at", endIso)
          .order("punch_in_at", { ascending: true })
          .limit(5000),
        supabase
          .from("hr_attendance")
          .select("user_id, punch_in_at, punch_out_at, status, created_at, total_distance_km")
          .in("user_id", batch)
          .in("status", ["on-leave", "holiday"])
          .gte("created_at", startIso)
          .lte("created_at", endIso)
          .limit(5000),
      ]);

      if (attendance) allRecords.push(...attendance);
      if (leaveAttendance) allRecords.push(...leaveAttendance);
    }

    const seen = new Set<string>();
    const deduped = allRecords.filter((r) => {
      const key = `${r.user_id}_${r.punch_in_at || r.created_at}_${r.status}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Group by user+date
    const dayMap = new Map<string, { user_id: string; date: string; firstIn: string | null; lastOut: string | null; status: string; distanceKm: number }>();

    for (const rec of deduped) {
      const ts = rec.punch_in_at || rec.created_at;
      const dateStr = ts ? toISTDateStr(new Date(ts)) : "";
      if (!dateStr) continue;
      const key = `${rec.user_id}_${dateStr}`;
      const existing = dayMap.get(key);
      const recDistance = (rec as Record<string, unknown>).total_distance_km as number | null;
      if (!existing) {
        dayMap.set(key, {
          user_id: rec.user_id,
          date: dateStr,
          firstIn: rec.punch_in_at,
          lastOut: rec.punch_out_at,
          status: rec.status || "present",
          distanceKm: recDistance || 0,
        });
      } else {
        if (rec.punch_in_at && (!existing.firstIn || rec.punch_in_at < existing.firstIn)) existing.firstIn = rec.punch_in_at;
        if (rec.punch_out_at && (!existing.lastOut || rec.punch_out_at > existing.lastOut)) existing.lastOut = rec.punch_out_at;
        if (rec.status === "on-leave" || rec.status === "holiday") existing.status = rec.status;
        else if (rec.status === "late" && existing.status !== "on-leave" && existing.status !== "holiday") existing.status = "late";
        existing.distanceKm += recDistance || 0;
      }
    }

    return Array.from(dayMap.values()).map((entry) => {
      const ms = entry.firstIn && entry.lastOut
        ? new Date(entry.lastOut).getTime() - new Date(entry.firstIn).getTime()
        : 0;
      const hours = ms / 3600000;

      // Recompute from hours only when both punch timestamps exist.
      // Without punch_out, trust DB status — covers admin overrides, WFH leave inserts, and stale open sessions.
      let correctedStatus = entry.status;
      if (!["on-leave", "holiday", "lwp"].includes(entry.status)
          && entry.firstIn && entry.lastOut) {
        if (hours >= 8) correctedStatus = "present";
        else if (hours >= 4) correctedStatus = "half-day";
        else correctedStatus = "absent";
      }

      return {
        ...entry,
        status: correctedStatus,
        name: profileMap.get(entry.user_id) || "Unknown",
        ms,
        distanceKm: entry.distanceKm,
      };
    });
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
      distanceKm: entry.distanceKm > 0 ? `${entry.distanceKm.toFixed(1)} km` : "--",
    }));
  }, [fetchAttendanceData, project, department, startDate, endDate]);

  // Monthly Summary — builds both summary rows AND day-by-day grid
  const fetchMonthlySummary = useCallback(async (): Promise<{ summaryRows: MonthlySummaryRow[]; gridRows: MonthlyGridRow[] }> => {
    const [year, month] = selectedMonth.split("-");
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const mStart = `${selectedMonth}-01`;
    const mEnd = `${selectedMonth}-${String(daysInMonth).padStart(2, "0")}`;

    // Get profile info including project
    let profileQuery = supabase.from("hr_profiles").select("id, full_name, project_id, department");
    if (project) profileQuery = profileQuery.eq("project_id", project);
    if (department) profileQuery = profileQuery.eq("department", department);
    const { data: profilesList } = await profileQuery;

    const profileInfoMap = new Map<string, { project: string }>();
    for (const p of (profilesList || [])) {
      profileInfoMap.set(p.id, { project: p.project_id || "--" });
    }

    const data = await fetchAttendanceData(project, department, mStart, mEnd);

    // Group by user
    const userMap = new Map<string, { name: string; userId: string; entries: typeof data }>();
    for (const entry of data) {
      const existing = userMap.get(entry.user_id);
      if (!existing) {
        userMap.set(entry.user_id, { name: entry.name, userId: entry.user_id, entries: [entry] });
      } else {
        existing.entries.push(entry);
      }
    }

    // Build grid data
    const gridRows: MonthlyGridRow[] = [];

    const summaryRows = Array.from(userMap.values()).map(({ name, userId, entries }) => {
      const daysPresent = entries.filter((e) => ["present", "late", "half-day"].includes(e.status)).length;
      const lateDays = entries.filter((e) => e.status === "late").length;
      const leaveDays = entries.filter((e) => e.status === "on-leave").length;
      const totalMs = entries.reduce((sum, e) => sum + e.ms, 0);
      const totalDist = entries.reduce((sum, e) => sum + (e.distanceKm || 0), 0);

      // Count working days (exclude Sundays) up to today or end of month
      const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      const mEndStr = `${selectedMonth}-${String(daysInMonth).padStart(2, "0")}`;
      const effectiveEnd = todayStr < mEndStr ? todayStr : mEndStr;
      const effectiveEndDay = parseInt(effectiveEnd.split("-")[2], 10);
      let workingDays = 0;
      for (let d = 1; d <= effectiveEndDay; d++) {
        const dayOfWeek = new Date(parseInt(year), parseInt(month) - 1, d).getDay();
        if (dayOfWeek !== 0) workingDays++; // Exclude Sundays
      }
      const daysAbsent = workingDays - daysPresent - leaveDays;

      // Build day-by-day data for grid
      const dayData: Record<number, { status: string; punchIn: string | null; punchOut: string | null; hours: string }> = {};
      for (const entry of entries) {
        const dayNum = parseInt(entry.date.split("-")[2], 10);
        dayData[dayNum] = {
          status: entry.status,
          punchIn: entry.firstIn,
          punchOut: entry.lastOut,
          hours: formatHours(entry.ms),
        };
      }

      gridRows.push({
        name,
        project: profileInfoMap.get(userId)?.project || "--",
        userId,
        days: dayData,
        totalPresent: daysPresent,
        totalAbsent: Math.max(0, daysAbsent),
        totalLeave: leaveDays,
      });

      return {
        name,
        daysPresent,
        daysAbsent: Math.max(0, daysAbsent),
        lateDays,
        leaveDays,
        totalHours: formatHours(totalMs),
        avgHoursPerDay: daysPresent > 0 ? formatHours(totalMs / daysPresent) : "0h",
        totalDistanceKm: totalDist > 0 ? `${totalDist.toFixed(1)} km` : "--",
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    gridRows.sort((a, b) => a.name.localeCompare(b.name));
    setMonthlyGrid(gridRows);

    return { summaryRows, gridRows };
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
      distanceKm: entry.distanceKm > 0 ? `${entry.distanceKm.toFixed(1)} km` : "--",
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
      const totalDist = entries.reduce((sum, e) => sum + (e.distanceKm || 0), 0);
      const daysAbsent = workingDays - daysPresent - leaveDays;

      return {
        name,
        daysPresent,
        daysAbsent: Math.max(0, daysAbsent),
        lateDays,
        leaveDays,
        totalHours: formatHours(totalMs),
        avgHoursPerDay: daysPresent > 0 ? formatHours(totalMs / daysPresent) : "0h",
        totalDistanceKm: totalDist > 0 ? `${totalDist.toFixed(1)} km` : "--",
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [fetchAttendanceData, project, startDate, endDate]);

  // Leave Report
  const fetchLeaveReport = useCallback(async (): Promise<LeaveReportRow[]> => {
    // Fetch leave requests with profile info
    let profilesQuery = supabase
      .from("hr_profiles")
      .select("id, full_name, project_id, department")
      .is("deactivated_at", null);

    if (project) profilesQuery = profilesQuery.eq("project_id", project);
    if (department) profilesQuery = profilesQuery.eq("department", department);

    const { data: profiles } = await profilesQuery;
    if (!profiles || profiles.length === 0) return [];

    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    const userIds = profiles.map((p) => p.id);

    const { data: requests } = await supabase
      .from("hr_leave_requests")
      .select("user_id, type, start_date, end_date, reason, status")
      .in("user_id", userIds)
      .gte("start_date", startDate)
      .lte("start_date", endDate)
      .order("start_date", { ascending: false })
      .limit(500);
    if (!requests || requests.length === 0) return [];

    return requests.map((req) => {
      const prof = profileMap.get(req.user_id);
      const days = Math.round(
        (Date.UTC(...req.end_date.split("-").map(Number) as [number, number, number]) -
          Date.UTC(...req.start_date.split("-").map(Number) as [number, number, number])) /
          (1000 * 60 * 60 * 24)
      ) + 1;

      const typeLabels: Record<string, string> = {
        sick: "Sick Leave",
        casual: "Casual Leave",
        privilege: "Privilege Leave",
        compoff: "Comp-Off",
        wfh: "Work From Home",
      };

      return {
        name: prof?.full_name || "Unknown",
        project: prof?.project_id || "--",
        department: prof?.department || "--",
        leaveType: typeLabels[req.type] || req.type,
        startDate: formatDate(req.start_date),
        endDate: formatDate(req.end_date),
        days,
        reason: req.reason || "--",
        status: req.status,
      };
    });
  }, [project, department, startDate, endDate]);

  // Not Present Today — immediate report
  const fetchNotPresent = useCallback(async (): Promise<NotPresentRow[]> => {
    const todayStr = todayIST();
    const todayIso = todayStr + "T00:00:00+05:30";

    // Get all employees with full profile
    let empQuery = supabase
      .from("hr_profiles")
      .select("id, full_name, designation, state, project_id, reporting_manager_id")
      .is("deactivated_at", null);

    const isUniversal =
      profile?.role === "super_admin" ||
      (profile?.designation?.toLowerCase().includes("hr") &&
        ["admin", "super_admin"].includes(profile?.role || ""));

    if (!isUniversal && profile?.project_id) {
      empQuery = empQuery.eq("project_id", profile.project_id);
    }

    const { data: allEmps } = await empQuery;
    if (!allEmps || allEmps.length === 0) return [];

    const empIds = allEmps.map((e) => e.id);

    // Fetch today's attendance in batches
    const batchSize = 50;
    const todayRecords: { user_id: string; punch_in_at: string | null; punch_out_at: string | null; status: string }[] = [];
    for (let i = 0; i < empIds.length; i += batchSize) {
      const batch = empIds.slice(i, i + batchSize);
      const { data } = await supabase
        .from("hr_attendance")
        .select("user_id, punch_in_at, punch_out_at, status")
        .in("user_id", batch)
        .gte("created_at", todayIso)
        .limit(5000);
      if (data) todayRecords.push(...data);
    }

    // Fetch today's approved leaves
    const { data: todayLeaves } = await supabase
      .from("hr_leave_requests")
      .select("user_id, type")
      .in("user_id", empIds)
      .eq("status", "approved")
      .lte("start_date", todayStr)
      .gte("end_date", todayStr);

    const onLeaveIds = new Set((todayLeaves || []).map((l) => l.user_id));
    const leaveTypeMap = new Map((todayLeaves || []).map((l) => [l.user_id, l.type]));

    // Compute actual hours per user
    const userHoursMs = new Map<string, number>();
    const userPresentIds = new Set<string>();
    for (const rec of todayRecords) {
      userPresentIds.add(rec.user_id);
      if (rec.punch_in_at) {
        const inMs = new Date(rec.punch_in_at).getTime();
        const outMs = rec.punch_out_at ? new Date(rec.punch_out_at).getTime() : Date.now();
        userHoursMs.set(rec.user_id, (userHoursMs.get(rec.user_id) || 0) + (outMs - inMs));
      }
    }

    // Resolve reporting manager names
    const mgrIds = Array.from(new Set(allEmps.map((e) => e.reporting_manager_id).filter(Boolean))) as string[];
    const mgrNames = new Map<string, string>();
    if (mgrIds.length > 0) {
      for (let i = 0; i < mgrIds.length; i += batchSize) {
        const batch = mgrIds.slice(i, i + batchSize);
        const { data } = await supabase.from("hr_profiles").select("id, full_name").in("id", batch);
        for (const m of data || []) mgrNames.set(m.id, m.full_name);
      }
    }

    // Build not-present list
    const result: NotPresentRow[] = [];
    const leaveLabels: Record<string, string> = { sick: "Sick Leave", casual: "Casual Leave", privilege: "Privilege Leave", compoff: "Comp-Off", wfh: "WFH" };

    for (const emp of allEmps) {
      const hoursMs = userHoursMs.get(emp.id) || 0;
      const hours = hoursMs / 3600000;
      const isOnLeave = onLeaveIds.has(emp.id);
      const hasPunched = userPresentIds.has(emp.id);

      let reason = "";
      if (isOnLeave) {
        reason = leaveLabels[leaveTypeMap.get(emp.id) || ""] || "On Leave";
      } else if (!hasPunched) {
        reason = "Absent — No Punch";
      } else if (hours < 1) {
        reason = "Absent — Less than 1h";
      } else if (hours < 4) {
        reason = `Half Day — ${Math.floor(hours)}h ${Math.floor((hours % 1) * 60)}m`;
      } else {
        continue; // Present — skip
      }

      result.push({
        name: emp.full_name,
        designation: emp.designation || "--",
        state: emp.state || "--",
        project: emp.project_id || "--",
        reportingManager: emp.reporting_manager_id ? mgrNames.get(emp.reporting_manager_id) || "--" : "--",
        reason,
      });
    }

    return result.sort((a, b) => a.reason.localeCompare(b.reason));
  }, [profile]);

  // Generate report
  const handlePreview = async () => {
    setLoading(true);
    setShowPreview(false);
    try {
      if (reportType === "not_present") {
        const result = await fetchNotPresent();
        setNotPresentRows(result);
        setRows([]);
        setSummaryRows([]);
        setLeaveRows([]);
        setTotalCount(result.length);
      } else if (reportType === "attendance") {
        const result = await fetchAttendanceReport();
        setRows(result);
        setSummaryRows([]);
        setTotalCount(result.length);
      } else if (reportType === "monthly") {
        const { summaryRows: result } = await fetchMonthlySummary();
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
        setLeaveRows([]);
        setTotalCount(result.length);
      } else if (reportType === "leave") {
        const result = await fetchLeaveReport();
        setLeaveRows(result);
        setRows([]);
        setSummaryRows([]);
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
      if (reportType === "not_present") {
        const result = await fetchNotPresent();
        setNotPresentRows(result);
        setTotalCount(result.length);
        setShowPreview(true);
        await exportToCsv(
          `not-present-today-${todayIST()}.csv`,
          ["Employee", "Designation", "State", "Project", "Reporting Manager", "Reason"],
          result.map((r) => [r.name, r.designation, r.state, r.project, r.reportingManager, r.reason])
        );
      } else if (reportType === "leave") {
        const result = await fetchLeaveReport();
        setLeaveRows(result);
        setTotalCount(result.length);
        setShowPreview(true);
        await exportToCsv(
          `leave-report-${startDate}-to-${endDate}.csv`,
          ["Employee", "Project", "Department", "Leave Type", "Start Date", "End Date", "Days", "Reason", "Status"],
          result.map((r) => [r.name, r.project, r.department, r.leaveType, r.startDate, r.endDate, String(r.days), r.reason, r.status])
        );
      } else if (reportType === "attendance" || reportType === "employee") {
        const result = reportType === "attendance" ? await fetchAttendanceReport() : await fetchEmployeeReport();
        setRows(result);
        setTotalCount(result.length);
        setShowPreview(true);
        await exportToCsv(
          `${reportType}-report-${startDate}-to-${endDate}.csv`,
          ["Employee", "Date", "Punch In", "Punch Out", "Hours", "Status", "Travel Distance"],
          result.map((r) => [r.name, r.date, r.punchIn, r.punchOut, r.hours, r.status, r.distanceKm || "--"])
        );
      } else if (reportType === "monthly") {
        const { gridRows } = await fetchMonthlySummary();
        setTotalCount(gridRows.length);
        setShowPreview(true);
        // Export grid format: Employee, Project, Day1..DayN, Present, Absent, Leave
        const [yr, mo] = selectedMonth.split("-").map(Number);
        const dim = new Date(yr, mo, 0).getDate();
        const dayHeaders = Array.from({ length: dim }, (_, i) => String(i + 1));
        await exportToCsv(
          `monthly-attendance-${selectedMonth}.csv`,
          ["Employee", "Project", ...dayHeaders, "Present", "Absent", "Leave"],
          gridRows.map((r) => [
            r.name,
            r.project,
            ...Array.from({ length: dim }, (_, i) => {
              const d = r.days[i + 1];
              return d ? (statusShortLabels[d.status] || "?") : "-";
            }),
            String(r.totalPresent),
            String(r.totalAbsent),
            String(r.totalLeave),
          ])
        );
      } else {
        const result = await fetchProjectSummary();
        setSummaryRows(result);
        setTotalCount(result.length);
        setShowPreview(true);
        await exportToCsv(
          `project-summary-${startDate}-to-${endDate}.csv`,
          ["Employee", "Days Present", "Days Absent", "Late Days", "Leave Days", "Total Hours", "Avg Hours/Day", "Total Travel"],
          result.map((r) => [r.name, String(r.daysPresent), String(r.daysAbsent), String(r.lateDays), String(r.leaveDays), r.totalHours, r.avgHoursPerDay, r.totalDistanceKm])
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadMonthlyDetail = async () => {
    setLoading(true);
    try {
      const { gridRows } = await fetchMonthlySummary();
      const [yr, mo] = selectedMonth.split("-").map(Number);
      const dim = new Date(yr, mo, 0).getDate();
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const rows: string[][] = [];
      for (const r of gridRows) {
        for (let d = 1; d <= dim; d++) {
          const dayData = r.days[d];
          const cellDate = new Date(yr, mo - 1, d);
          const dayName = dayNames[cellDate.getDay()];
          const isSunday = cellDate.getDay() === 0;
          const status = dayData
            ? (statusShortLabels[dayData.status] || dayData.status)
            : isSunday ? "SU" : "A";
          rows.push([
            r.name,
            r.project,
            `${yr}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
            dayName,
            dayData?.punchIn ? new Date(dayData.punchIn).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }) : "",
            dayData?.punchOut ? new Date(dayData.punchOut).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }) : "",
            dayData?.hours || "",
            status,
          ]);
        }
      }
      await exportToCsv(
        `monthly-detail-${selectedMonth}.csv`,
        ["Employee", "Project", "Date", "Day", "Punch In", "Punch Out", "Hours", "Status"],
        rows
      );
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
        {/* Not Present Today — no filters needed */}
        {reportType === "not_present" && (
          <>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Showing employees who are absent, on leave, or have less than 4 hours today ({new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })})
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handlePreview} disabled={loading} className="uds-btn-secondary">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                {loading ? "Loading..." : "Refresh"}
              </button>
              <button onClick={handleDownload} disabled={loading} className="uds-btn-primary">
                <Download className="w-4 h-4" /> Download CSV
              </button>
            </div>
            {showPreview && (
              notPresentRows.length > 0 ? (
                <NotPresentTable rows={notPresentRows} total={totalCount} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-green-600 font-medium">Everyone is present today!</p>
                  <p className="text-xs text-gray-400 mt-1">No absent or half-day employees found</p>
                </div>
              )
            )}
          </>
        )}

        {/* Date inputs — different for monthly vs others (hidden for not_present) */}
        {reportType === "not_present" ? null : reportType === "monthly" ? (
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

        {/* Filters — different per type (hidden for not_present) */}
        {reportType === "not_present" ? null : reportType === "employee" ? (
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

        {/* Action Buttons (hidden for not_present — it has its own) */}
        {reportType !== "not_present" && (
          <div className="flex flex-col gap-2">
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
                <Download className="w-4 h-4" /> {reportType === "monthly" ? "Summary CSV" : "Download CSV"}
              </button>
            </div>
            {reportType === "monthly" && (
              <button
                onClick={handleDownloadMonthlyDetail}
                disabled={loading}
                className="uds-btn-secondary w-full flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Daily Detail CSV (Punch In/Out)
              </button>
            )}
          </div>
        )}

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

            {/* Monthly grid view + day-wise detail */}
            {reportType === "monthly" && (
              monthlyGrid.length > 0 ? (
                <>
                  <MonthlyGridTable
                    rows={monthlyGrid}
                    month={selectedMonth}
                    onDayClick={(name, dayNum, userId) => {
                      const row = monthlyGrid.find((r) => r.userId === userId);
                      const dayData = row?.days[dayNum];
                      const [yr, mo] = selectedMonth.split("-");
                      const rawDate = `${yr}-${mo}-${String(dayNum).padStart(2, "0")}`;
                      setOverrideStatus("");
                      setDayDetail({
                        name,
                        date: formatDate(rawDate),
                        rawDate,
                        userId,
                        punchIn: dayData ? formatTime(dayData.punchIn) : "--",
                        punchOut: dayData ? formatTime(dayData.punchOut) : "--",
                        hours: dayData?.hours || "0h",
                        status: dayData?.status || "no-record",
                      });
                    }}
                  />
                  <MonthlyDayDetailTable rows={monthlyGrid} month={selectedMonth} />
                </>
              ) : (
                <div className="text-center py-8 text-sm text-gray-400">
                  No data found for the selected month.
                </div>
              )
            )}

            {/* Project summary table */}
            {reportType === "project" && (
              summaryRows.length > 0 ? (
                <SummaryTable rows={summaryRows} total={totalCount} />
              ) : (
                <div className="text-center py-8 text-sm text-gray-400">
                  No data found for the selected criteria.
                </div>
              )
            )}

            {/* Leave report table */}
            {reportType === "leave" && (
              leaveRows.length > 0 ? (
                <LeaveTable rows={leaveRows} total={totalCount} />
              ) : (
                <div className="text-center py-8 text-sm text-gray-400">
                  No leave requests found for the selected range.
                </div>
              )
            )}
          </>
        )}

        {/* Day Detail Modal */}
        {dayDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-6" onClick={() => setDayDetail(null)}>
            <div className="w-full max-w-sm bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-semibold mb-4">{dayDetail.name} — {dayDetail.date}</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className="font-medium capitalize">{dayDetail.status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Punch In</span>
                  <span className="font-medium">{dayDetail.punchIn}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Punch Out</span>
                  <span className="font-medium">{dayDetail.punchOut}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Hours Worked</span>
                  <span className="font-medium">{dayDetail.hours}</span>
                </div>
              </div>

              {/* Admin Override */}
              {profile && ["admin", "super_admin"].includes(profile.role) && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Override Status</label>
                  <div className="flex gap-2">
                    <select
                      value={overrideStatus}
                      onChange={(e) => setOverrideStatus(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                    >
                      <option value="">Select status...</option>
                      <option value="absent">Absent</option>
                      <option value="present">Present</option>
                      <option value="half-day">Half Day</option>
                      <option value="lwp">LWP</option>
                      <option value="late">Late</option>
                    </select>
                    <button
                      disabled={!overrideStatus || overrideLoading}
                      onClick={async () => {
                        if (!session?.access_token || !overrideStatus) return;
                        setOverrideLoading(true);
                        try {
                          const res = await fetch("/api/admin/attendance-override", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${session.access_token}`,
                            },
                            body: JSON.stringify({ user_id: dayDetail.userId, date: dayDetail.rawDate, status: overrideStatus }),
                          });
                          const data = await res.json();
                          if (res.ok) {
                            showToast(data.message || "Status updated", "success");
                            setDayDetail(null);
                            handlePreview(); // Refresh grid
                          } else {
                            showToast(data.error || "Failed to update", "error");
                          }
                        } catch {
                          showToast("Failed to update status", "error");
                        } finally {
                          setOverrideLoading(false);
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {overrideLoading ? "..." : "Apply"}
                    </button>
                  </div>
                </div>
              )}

              <button onClick={() => setDayDetail(null)} className="mt-4 w-full py-2.5 rounded-xl bg-primary text-white text-sm font-medium">
                Close
              </button>
            </div>
          </div>
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
              <th className="text-left py-3 px-3 font-medium whitespace-nowrap">Travel</th>
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
                <td className="py-3 px-3 whitespace-nowrap text-gray-500">{row.totalDistanceKm}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeaveTable({ rows, total }: { rows: LeaveReportRow[]; total: number }) {
  const statusColors: Record<string, string> = {
    pending: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400",
    approved: "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400",
    rejected: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400",
    withdrawn: "text-gray-500 bg-gray-50 dark:bg-gray-800 dark:text-gray-400",
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700/50">
        <h3 className="text-sm font-semibold">Leave Report</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
          {rows.length} of {total}
        </span>
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-900 text-xs text-gray-500 dark:text-gray-400">
              <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Employee</th>
              <th className="text-left py-3 px-3 font-medium whitespace-nowrap">Project</th>
              <th className="text-left py-3 px-3 font-medium whitespace-nowrap">Type</th>
              <th className="text-left py-3 px-3 font-medium whitespace-nowrap">From</th>
              <th className="text-left py-3 px-3 font-medium whitespace-nowrap">To</th>
              <th className="text-center py-3 px-3 font-medium whitespace-nowrap">Days</th>
              <th className="text-left py-3 px-3 font-medium whitespace-nowrap">Status</th>
              <th className="text-left py-3 px-3 font-medium whitespace-nowrap">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="py-3 px-4 font-medium whitespace-nowrap">{row.name}</td>
                <td className="py-3 px-3 whitespace-nowrap text-gray-500">{row.project}</td>
                <td className="py-3 px-3 whitespace-nowrap">{row.leaveType}</td>
                <td className="py-3 px-3 whitespace-nowrap">{row.startDate}</td>
                <td className="py-3 px-3 whitespace-nowrap">{row.endDate}</td>
                <td className="py-3 px-3 text-center">{row.days}</td>
                <td className="py-3 px-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[row.status] || ""}`}>
                    {row.status}
                  </span>
                </td>
                <td className="py-3 px-3 text-gray-500 max-w-[200px] truncate">{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const statusCellColors: Record<string, string> = {
  present: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  absent: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  late: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  "half-day": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  "on-leave": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  holiday: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
  lwp: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

const statusShortLabels: Record<string, string> = {
  present: "P",
  late: "L",
  "half-day": "H",
  "on-leave": "LV",
  holiday: "HD",
  lwp: "LWP",
  absent: "A",
};

function MonthlyGridTable({ rows, month, onDayClick }: {
  rows: MonthlyGridRow[];
  month: string;
  onDayClick: (name: string, dayNum: number, userId: string) => void;
}) {
  const [year, mo] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mo, 0).getDate();
  const dayNums = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700/50">
        <h3 className="text-sm font-semibold">Monthly Attendance Sheet</h3>
        <p className="text-xs text-gray-400 mt-1">Tap any cell to see punch in/out details</p>
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <table className="text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-900">
              <th className="text-left py-2 px-3 font-medium whitespace-nowrap sticky left-0 bg-gray-50 dark:bg-slate-900 z-10 min-w-[120px]">Employee</th>
              <th className="text-left py-2 px-2 font-medium whitespace-nowrap sticky left-[120px] bg-gray-50 dark:bg-slate-900 z-10 min-w-[80px]">Project</th>
              {dayNums.map((d) => {
                const dayOfWeek = new Date(year, mo - 1, d).getDay();
                const isSunday = dayOfWeek === 0;
                return (
                  <th key={d} className={`text-center py-2 px-1 font-medium min-w-[32px] ${isSunday ? "text-orange-400" : "text-gray-500 dark:text-gray-400"}`}>
                    {d}
                  </th>
                );
              })}
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap text-green-600">P</th>
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap text-red-500">A</th>
              <th className="text-center py-2 px-2 font-medium whitespace-nowrap text-blue-500">LV</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {rows.map((row) => (
              <tr key={row.userId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="py-2 px-3 font-medium whitespace-nowrap sticky left-0 bg-white dark:bg-slate-800 z-10">{row.name}</td>
                <td className="py-2 px-2 text-gray-500 whitespace-nowrap sticky left-[120px] bg-white dark:bg-slate-800 z-10">{row.project}</td>
                {dayNums.map((d) => {
                  const dayData = row.days[d];
                  const cellDate = new Date(year, mo - 1, d);
                  const cellDateStr = cellDate.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
                  const dayOfWeek = cellDate.getDay();
                  const isSunday = dayOfWeek === 0;
                  const isPast = cellDateStr < todayStr;

                  if (!dayData) {
                    if (isSunday) {
                      return (
                        <td key={d} className="py-2 px-1 text-center bg-orange-50/60 dark:bg-orange-900/10">
                          <span className="inline-flex items-center justify-center w-6 h-5 rounded text-[10px] font-semibold bg-orange-100 dark:bg-orange-900/40 text-orange-500">
                            SU
                          </span>
                        </td>
                      );
                    }
                    if (isPast) {
                      return (
                        <td key={d} onClick={() => onDayClick(row.name, d, row.userId)} className="py-2 px-1 text-center cursor-pointer">
                          <span className="inline-flex items-center justify-center w-6 h-5 rounded text-[10px] font-semibold bg-red-100 dark:bg-red-900/40 text-red-500">
                            A
                          </span>
                        </td>
                      );
                    }
                    return (
                      <td key={d} className="py-2 px-1 text-center">
                        <span className="text-gray-300 dark:text-gray-600">-</span>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={d}
                      onClick={() => onDayClick(row.name, d, row.userId)}
                      className={`py-2 px-1 text-center cursor-pointer ${isSunday ? "bg-orange-50/40 dark:bg-orange-900/10" : ""}`}
                    >
                      <span className={`inline-flex items-center justify-center w-6 h-5 rounded text-[10px] font-semibold ${isSunday ? "ring-1 ring-orange-400 " : ""}${statusCellColors[dayData.status] || "bg-gray-100 text-gray-500"}`}>
                        {statusShortLabels[dayData.status] || "?"}
                      </span>
                    </td>
                  );
                })}
                <td className="py-2 px-2 text-center font-medium text-green-600">{row.totalPresent}</td>
                <td className="py-2 px-2 text-center font-medium text-red-500">{row.totalAbsent}</td>
                <td className="py-2 px-2 text-center font-medium text-blue-500">{row.totalLeave}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-3 border-t border-gray-100 dark:border-gray-700/50 flex gap-3 flex-wrap text-[10px]">
        <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-green-100 dark:bg-green-900/40"></span> P = Present</span>
        <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-amber-100 dark:bg-amber-900/40"></span> L = Late</span>
        <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-orange-100 dark:bg-orange-900/40"></span> H = Half Day</span>
        <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-blue-100 dark:bg-blue-900/40"></span> LV = Leave</span>
        <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-red-100 dark:bg-red-900/40"></span> A/LWP = Absent/LWP</span>
        <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-orange-100 dark:bg-orange-900/30 ring-1 ring-orange-400"></span> Ring = Worked on Sunday</span>
        <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-500 flex items-center justify-center text-[8px] font-bold">SU</span> = Sunday (Week Off)</span>
      </div>
    </div>
  );
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function MonthlyDayDetailTable({ rows, month }: { rows: MonthlyGridRow[]; month: string }) {
  const [year, mo] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mo, 0).getDate();
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700/50">
        <h3 className="text-sm font-semibold">Day-wise Detail — Check In / Check Out</h3>
        <p className="text-xs text-gray-400 mt-1">Full month breakdown for all employees</p>
      </div>
      {rows.map((row) => (
        <div key={row.userId} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
          <div className="px-4 py-2 bg-gray-50 dark:bg-slate-900 flex items-center justify-between">
            <span className="text-xs font-semibold">{row.name}</span>
            <span className="text-[10px] text-gray-400">{row.project}</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100 dark:border-gray-700/50">
                <th className="text-left py-1 px-3 font-medium w-[80px]">Date</th>
                <th className="text-left py-1 px-2 font-medium w-[28px]">Day</th>
                <th className="text-center py-1 px-2 font-medium">In</th>
                <th className="text-center py-1 px-2 font-medium">Out</th>
                <th className="text-center py-1 px-2 font-medium">Hrs</th>
                <th className="text-center py-1 px-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/30">
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                const dayData = row.days[d];
                const cellDate = new Date(year, mo - 1, d);
                const cellDateStr = cellDate.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
                const dow = cellDate.getDay();
                const isSunday = dow === 0;
                const isPast = cellDateStr < todayStr;

                let statusLabel = "-";
                let rowBg = "";
                if (dayData) {
                  statusLabel = statusShortLabels[dayData.status] || dayData.status;
                  if (isSunday) rowBg = "bg-orange-50/50 dark:bg-orange-900/10";
                } else if (isSunday) {
                  statusLabel = "SU";
                  rowBg = "bg-orange-50/50 dark:bg-orange-900/10";
                } else if (isPast) {
                  statusLabel = "A";
                  rowBg = "bg-red-50/30 dark:bg-red-900/5";
                }

                const punchIn = dayData?.punchIn
                  ? new Date(dayData.punchIn).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false })
                  : isSunday ? "—" : "--";
                const punchOut = dayData?.punchOut
                  ? new Date(dayData.punchOut).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false })
                  : isSunday ? "—" : "--";

                return (
                  <tr key={d} className={rowBg}>
                    <td className="py-1.5 px-3 font-medium">
                      {String(d).padStart(2, "0")}/{String(mo).padStart(2, "0")}
                    </td>
                    <td className={`py-1.5 px-2 ${isSunday ? "text-orange-500 font-semibold" : "text-gray-400"}`}>
                      {DAY_NAMES[dow]}
                    </td>
                    <td className="py-1.5 px-2 text-center text-gray-700 dark:text-gray-300">{punchIn}</td>
                    <td className="py-1.5 px-2 text-center text-gray-700 dark:text-gray-300">{punchOut}</td>
                    <td className="py-1.5 px-2 text-center text-gray-500">{dayData?.hours || (isSunday ? "—" : "")}</td>
                    <td className="py-1.5 px-2 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-4 rounded text-[9px] font-semibold ${
                        isSunday && !dayData
                          ? "bg-orange-100 dark:bg-orange-900/40 text-orange-500"
                          : dayData
                          ? (isSunday ? `ring-1 ring-orange-400 ${statusCellColors[dayData.status] || "bg-gray-100 text-gray-500"}` : statusCellColors[dayData.status] || "bg-gray-100 text-gray-500")
                          : isPast
                          ? "bg-red-100 dark:bg-red-900/40 text-red-500"
                          : "text-gray-300"
                      }`}>
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-2 bg-gray-50/50 dark:bg-slate-900/50 flex gap-4 text-[10px] text-gray-500">
            <span>Present: <strong className="text-green-600">{row.totalPresent}</strong></span>
            <span>Absent: <strong className="text-red-500">{row.totalAbsent}</strong></span>
            <span>Leave: <strong className="text-blue-500">{row.totalLeave}</strong></span>
          </div>
        </div>
      ))}
    </div>
  );
}

function NotPresentTable({ rows, total }: { rows: NotPresentRow[]; total: number }) {
  const absentCount = rows.filter((r) => r.reason.startsWith("Absent")).length;
  const halfDayCount = rows.filter((r) => r.reason.startsWith("Half")).length;
  const leaveCount = rows.filter((r) => !r.reason.startsWith("Absent") && !r.reason.startsWith("Half")).length;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Not Present Today</h3>
          <span className="text-xs text-gray-500 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full">
            {total} employees
          </span>
        </div>
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="text-red-500 font-medium">{absentCount} Absent</span>
          <span className="text-orange-500 font-medium">{halfDayCount} Half Day</span>
          <span className="text-blue-500 font-medium">{leaveCount} On Leave</span>
        </div>
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-900 text-xs text-gray-500 dark:text-gray-400">
              <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Employee</th>
              <th className="text-left py-3 px-3 font-medium whitespace-nowrap">Designation</th>
              <th className="text-left py-3 px-3 font-medium whitespace-nowrap">State</th>
              <th className="text-left py-3 px-3 font-medium whitespace-nowrap">Manager</th>
              <th className="text-left py-3 px-3 font-medium whitespace-nowrap">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {rows.map((row, idx) => {
              const isAbsent = row.reason.startsWith("Absent");
              const isHalf = row.reason.startsWith("Half");
              return (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="py-3 px-4 font-medium whitespace-nowrap">{row.name}</td>
                  <td className="py-3 px-3 whitespace-nowrap text-gray-500">{row.designation}</td>
                  <td className="py-3 px-3 whitespace-nowrap text-gray-500">{row.state}</td>
                  <td className="py-3 px-3 whitespace-nowrap text-gray-500">{row.reportingManager}</td>
                  <td className="py-3 px-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      isAbsent ? "text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400" :
                      isHalf ? "text-orange-700 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400" :
                      "text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400"
                    }`}>
                      {row.reason}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
