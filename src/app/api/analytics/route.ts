import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("hr_profiles")
    .select("role, id, project_id, designation")
    .eq("id", user.id)
    .is("deactivated_at", null)
    .single();

  if (!profile || !["manager", "admin", "super_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "this_month";

  const pad2 = (n: number) => n.toString().padStart(2, "0");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const [todayYear, todayMonth] = today.split("-").map(Number);

  let startStr: string;
  let endStr: string;
  let endDay: string;

  if (period === "last_month") {
    const lm = todayMonth === 1 ? 12 : todayMonth - 1;
    const ly = todayMonth === 1 ? todayYear - 1 : todayYear;
    const lastDayOfLastMonth = new Date(ly, lm, 0).getDate();
    startStr = `${ly}-${pad2(lm)}-01T00:00:00+05:30`;
    endStr = `${ly}-${pad2(lm)}-${pad2(lastDayOfLastMonth)}T23:59:59+05:30`;
    endDay = `${ly}-${pad2(lm)}-${pad2(lastDayOfLastMonth)}`;
  } else if (period === "last_3_months") {
    const d = new Date(todayYear, todayMonth - 4, 1);
    const sy = d.getFullYear();
    const sm = d.getMonth() + 1;
    startStr = `${sy}-${pad2(sm)}-01T00:00:00+05:30`;
    endStr = `${today}T23:59:59+05:30`;
    endDay = today;
  } else {
    startStr = `${todayYear}-${pad2(todayMonth)}-01T00:00:00+05:30`;
    endStr = `${today}T23:59:59+05:30`;
    endDay = today;
  }

  // Get employees scoped by role
  let employeesQuery = supabaseAdmin
    .from("hr_profiles")
    .select("id, full_name, designation, department, project_id")
    .is("deactivated_at", null);

  if (profile.role === "manager") {
    employeesQuery = employeesQuery.eq("reporting_manager_id", user.id);
  }

  const { data: employees } = await employeesQuery;
  if (!employees || employees.length === 0) {
    return NextResponse.json(emptyResponse());
  }

  const employeeIds = employees.map((e) => e.id);
  const empMap = new Map(employees.map((e) => [e.id, e]));

  // Fetch all attendance for the period
  const { data: attendance } = await supabaseAdmin
    .from("hr_attendance")
    .select()
    .in("user_id", employeeIds)
    .gte("punch_in_at", startStr)
    .lte("punch_in_at", endStr);

  // Also get leave-day attendance records
  const { data: leaveAttendance } = await supabaseAdmin
    .from("hr_attendance")
    .select()
    .in("user_id", employeeIds)
    .in("status", ["on-leave", "holiday"])
    .gte("created_at", startStr)
    .lte("created_at", endStr);

  // Today's data
  const todayStartIST = today + "T00:00:00+05:30";
  const { data: todayAttendance } = await supabaseAdmin
    .from("hr_attendance")
    .select()
    .in("user_id", employeeIds)
    .or(`punch_in_at.gte.${todayStartIST},and(punch_in_at.is.null,created_at.gte.${todayStartIST})`);

  const { data: todayLeaves } = await supabaseAdmin
    .from("hr_leave_requests")
    .select()
    .in("user_id", employeeIds)
    .eq("status", "approved")
    .lte("start_date", today)
    .gte("end_date", today);

  const { data: todayLocations } = await supabaseAdmin
    .from("hr_location_logs")
    .select("user_id")
    .in("user_id", employeeIds)
    .gte("captured_at", todayStartIST);

  // Merge attendance + leave attendance (deduplicated)
  const allRecordIds = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRecords: any[] = [];
  for (const rec of [...(attendance || []), ...(leaveAttendance || [])]) {
    if (!allRecordIds.has(rec.id)) {
      allRecordIds.add(rec.id);
      allRecords.push(rec);
    }
  }

  // ===== SUMMARY =====
  const presentTodayIds = new Set((todayAttendance || []).map((a) => a.user_id));
  const onLeaveTodayIds = new Set((todayLeaves || []).map((l) => l.user_id));
  const inFieldIds = new Set((todayLocations || []).filter((l) => {
    return (todayAttendance || []).some((a) => a.user_id === l.user_id && !a.punch_out_at);
  }).map((l) => l.user_id));

  const summary = {
    totalEmployees: employees.length,
    presentToday: presentTodayIds.size,
    absentToday: Math.max(0, employees.length - presentTodayIds.size - onLeaveTodayIds.size),
    onLeaveToday: onLeaveTodayIds.size,
    inFieldNow: inFieldIds.size,
  };

  // ===== CORE STATS =====
  let totalHours = 0;
  let recordsWithHours = 0;
  let lateCount = 0;
  const punchInMinutes: number[] = [];
  const workingDaysByEmployee = new Map<string, Set<string>>();
  const lateDaysByEmployee = new Map<string, number>();
  const hoursByEmployee = new Map<string, number>();

  // Aggregate accumulators
  const punchInHourBuckets: number[] = new Array(24).fill(0);
  const dayOfWeekHours: number[] = new Array(7).fill(0);
  const dayOfWeekCount: number[] = new Array(7).fill(0);
  const dayOfWeekPresent = new Map<number, Set<string>>(); // dow → unique day strings
  const projectStats = new Map<string, { hours: number; count: number; late: number }>();
  const departmentStats = new Map<string, { hours: number; count: number; late: number }>();
  const weeklyBuckets = new Map<string, { present: Set<string>; hours: number }>();

  for (const rec of allRecords) {
    const ts = rec.punch_in_at || rec.created_at;
    const day = new Date(ts).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    if (!workingDaysByEmployee.has(rec.user_id)) workingDaysByEmployee.set(rec.user_id, new Set());
    workingDaysByEmployee.get(rec.user_id)!.add(day);

    const emp = empMap.get(rec.user_id);
    const project = emp?.project_id || "Unassigned";
    const department = emp?.department || "Unassigned";

    if (!projectStats.has(project)) projectStats.set(project, { hours: 0, count: 0, late: 0 });
    if (!departmentStats.has(department)) departmentStats.set(department, { hours: 0, count: 0, late: 0 });

    // Week bucket (ISO week start = Monday)
    const dateObj = new Date(ts);
    const weekStart = getWeekStart(dateObj);
    if (!weeklyBuckets.has(weekStart)) weeklyBuckets.set(weekStart, { present: new Set(), hours: 0 });

    if (rec.punch_in_at && rec.punch_out_at) {
      const dur = (new Date(rec.punch_out_at).getTime() - new Date(rec.punch_in_at).getTime()) / 3600000;
      totalHours += dur;
      recordsWithHours++;
      hoursByEmployee.set(rec.user_id, (hoursByEmployee.get(rec.user_id) || 0) + dur);

      // Day of week
      const dow = new Date(rec.punch_in_at).toLocaleDateString("en-US", { weekday: "short", timeZone: "Asia/Kolkata" });
      const dowIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(dow);
      dayOfWeekHours[dowIndex] += dur;
      dayOfWeekCount[dowIndex]++;
      if (!dayOfWeekPresent.has(dowIndex)) dayOfWeekPresent.set(dowIndex, new Set());
      dayOfWeekPresent.get(dowIndex)!.add(day);

      // Project/dept hours
      projectStats.get(project)!.hours += dur;
      departmentStats.get(department)!.hours += dur;

      // Weekly
      weeklyBuckets.get(weekStart)!.hours += dur;
    }

    if (rec.punch_in_at) {
      const punchIn = new Date(rec.punch_in_at);
      const istTime = punchIn.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
      const [istH, istM] = istTime.split(":").map(Number);
      const mins = istH * 60 + istM;
      punchInMinutes.push(mins);

      // Punch-in hour distribution
      punchInHourBuckets[istH]++;

      // Late if after 10:00 AM IST
      if (mins > 600) {
        lateCount++;
        lateDaysByEmployee.set(rec.user_id, (lateDaysByEmployee.get(rec.user_id) || 0) + 1);
        projectStats.get(project)!.late++;
        departmentStats.get(department)!.late++;
      }

      projectStats.get(project)!.count++;
      departmentStats.get(department)!.count++;
      weeklyBuckets.get(weekStart)!.present.add(rec.user_id);
    }
  }

  const avgHours = recordsWithHours > 0 ? Math.round((totalHours / recordsWithHours) * 10) / 10 : 0;
  const avgPunchInMins = punchInMinutes.length > 0
    ? Math.round(punchInMinutes.reduce((a, b) => a + b, 0) / punchInMinutes.length)
    : 0;
  const avgPunchInHH = Math.floor(avgPunchInMins / 60);
  const avgPunchInMM = avgPunchInMins % 60;
  const avgPunchInTime = punchInMinutes.length > 0
    ? `${avgPunchInHH.toString().padStart(2, "0")}:${avgPunchInMM.toString().padStart(2, "0")}`
    : "--";

  // Working days
  let totalWorkDays = 0;
  const startDateStr = startStr.split("T")[0];
  const iterDate = new Date(startDateStr + "T12:00:00+05:30");
  const endDate2 = new Date(endDay + "T12:00:00+05:30");
  while (iterDate <= endDate2) {
    const dayOfWeek = iterDate.toLocaleDateString("en-US", { weekday: "short", timeZone: "Asia/Kolkata" });
    if (dayOfWeek !== "Sun" && dayOfWeek !== "Sat") totalWorkDays++;
    iterDate.setDate(iterDate.getDate() + 1);
  }

  const perfectAttendanceCount = employees.filter((e) => {
    const days = workingDaysByEmployee.get(e.id);
    return days && days.size >= totalWorkDays && (lateDaysByEmployee.get(e.id) || 0) === 0;
  }).length;

  const attendanceStats = { avgHoursWorked: avgHours, avgPunchInTime, lateCount, perfectAttendanceCount };

  // ===== EMPLOYEE STATS =====
  const employeeStats = employees.map((emp) => {
    const days = workingDaysByEmployee.get(emp.id);
    const presentDays = days ? days.size : 0;
    const lateDays = lateDaysByEmployee.get(emp.id) || 0;
    const hours = hoursByEmployee.get(emp.id) || 0;
    const avgEmpHours = presentDays > 0 ? Math.round((hours / presentDays) * 10) / 10 : 0;
    return {
      id: emp.id,
      name: emp.full_name,
      designation: emp.designation,
      presentDays,
      absentDays: Math.max(0, totalWorkDays - presentDays),
      lateDays,
      avgHours: avgEmpHours,
    };
  });

  // ===== DAILY TRENDS =====
  const dayMap = new Map<string, Set<string>>();
  for (const rec of allRecords) {
    const ts = rec.punch_in_at || rec.created_at;
    const day = new Date(ts).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    if (!dayMap.has(day)) dayMap.set(day, new Set());
    dayMap.get(day)!.add(rec.user_id);
  }

  const trends: { date: string; count: number }[] = [];
  const trendDate = new Date(startDateStr + "T12:00:00+05:30");
  const trendEndDate = new Date(endDay + "T12:00:00+05:30");
  while (trendDate <= trendEndDate) {
    const ds = trendDate.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const dow = trendDate.getDay();
    if (dow !== 0 && dow !== 6) {
      trends.push({ date: ds, count: dayMap.get(ds)?.size || 0 });
    }
    trendDate.setDate(trendDate.getDate() + 1);
  }

  // ===== INSIGHTS =====
  const insights: { type: "warning" | "positive" | "info"; text: string }[] = [];

  // Aggregate insights (not individual)
  const totalLatePercent = punchInMinutes.length > 0 ? Math.round((lateCount / punchInMinutes.length) * 100) : 0;
  if (totalLatePercent > 30) {
    insights.push({ type: "warning", text: `${totalLatePercent}% of all punch-ins are after 10:00 AM — consider reviewing shift timings` });
  }
  if (avgHours > 0 && avgHours < 4) {
    insights.push({ type: "warning", text: `Average working hours is only ${avgHours}h — below the 4h threshold for full-day attendance` });
  }
  if (perfectAttendanceCount > 0) {
    insights.push({ type: "positive", text: `${perfectAttendanceCount} employee(s) with perfect attendance this period` });
  }
  if (avgHours >= 6) {
    insights.push({ type: "positive", text: `Team averages ${avgHours}h/day — good performance` });
  }
  if (summary.inFieldNow > 0) {
    insights.push({ type: "info", text: `${summary.inFieldNow} team member(s) currently in the field` });
  }

  // Identify worst-performing project/dept by late %
  Array.from(projectStats.entries()).forEach(([name, stats]) => {
    if (stats.count >= 10 && stats.late / stats.count > 0.4) {
      insights.push({ type: "warning", text: `Project "${name}" has ${Math.round((stats.late / stats.count) * 100)}% late punch-ins` });
    }
  });

  // Top performers (individual — kept light)
  const topPerformers = employeeStats
    .filter((e) => e.presentDays >= totalWorkDays && e.lateDays === 0 && e.avgHours >= 6)
    .slice(0, 3);
  if (topPerformers.length > 0) {
    insights.push({ type: "positive", text: `Top performers: ${topPerformers.map((e) => e.name).join(", ")}` });
  }

  // ===== PUNCH-IN TIME DISTRIBUTION =====
  const punchInDistribution = punchInHourBuckets
    .map((count, hour) => ({ hour, count }))
    .filter((b) => b.hour >= 6 && b.hour <= 22); // Only show 6 AM to 10 PM

  // ===== DAY OF WEEK PATTERN =====
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayOfWeekPattern = dayNames.map((name, i) => ({
    day: name,
    avgPresent: dayOfWeekPresent.get(i)?.size
      ? Math.round((dayOfWeekCount[i] / dayOfWeekPresent.get(i)!.size) * 10) / 10
      : 0,
    avgHours: dayOfWeekCount[i] > 0 ? Math.round((dayOfWeekHours[i] / dayOfWeekCount[i]) * 10) / 10 : 0,
    totalRecords: dayOfWeekCount[i],
  }));

  // ===== PROJECT BREAKDOWN =====
  const projectBreakdown = Array.from(projectStats.entries()).map(([name, stats]) => ({
    name,
    records: stats.count,
    avgHours: stats.count > 0 ? Math.round((stats.hours / stats.count) * 10) / 10 : 0,
    latePercent: stats.count > 0 ? Math.round((stats.late / stats.count) * 100) : 0,
    employees: employees.filter((e) => (e.project_id || "Unassigned") === name).length,
  })).sort((a, b) => b.employees - a.employees);

  // ===== DEPARTMENT BREAKDOWN =====
  const departmentBreakdown = Array.from(departmentStats.entries()).map(([name, stats]) => ({
    name,
    records: stats.count,
    avgHours: stats.count > 0 ? Math.round((stats.hours / stats.count) * 10) / 10 : 0,
    latePercent: stats.count > 0 ? Math.round((stats.late / stats.count) * 100) : 0,
    employees: employees.filter((e) => (e.department || "Unassigned") === name).length,
  })).sort((a, b) => b.employees - a.employees);

  // ===== WEEKLY COMPARISON =====
  const weeklyComparison = Array.from(weeklyBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, data]) => ({
      week,
      presentCount: data.present.size,
      avgHours: data.present.size > 0 ? Math.round((data.hours / data.present.size) * 10) / 10 : 0,
    }));

  return NextResponse.json({
    summary,
    attendance: attendanceStats,
    employeeStats,
    trends,
    insights,
    punchInDistribution,
    dayOfWeekPattern,
    projectBreakdown,
    departmentBreakdown,
    weeklyComparison,
  });
}

function emptyResponse() {
  return {
    summary: { totalEmployees: 0, presentToday: 0, absentToday: 0, onLeaveToday: 0, inFieldNow: 0 },
    attendance: { avgHoursWorked: 0, avgPunchInTime: "--", lateCount: 0, perfectAttendanceCount: 0 },
    employeeStats: [],
    trends: [],
    insights: [],
    punchInDistribution: [],
    dayOfWeekPattern: [],
    projectBreakdown: [],
    departmentBreakdown: [],
    weeklyComparison: [],
  };
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}
