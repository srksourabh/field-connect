import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    .select("role, id")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "manager" && profile.role !== "super_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "this_month";

  // Determine date range
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (period === "last_month") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = now;
  }

  const pad2 = (n: number) => n.toString().padStart(2, "0");
  const startStr = `${startDate.getFullYear()}-${pad2(startDate.getMonth() + 1)}-${pad2(startDate.getDate())}T00:00:00+05:30`;
  const endStr = `${endDate.getFullYear()}-${pad2(endDate.getMonth() + 1)}-${pad2(endDate.getDate())}T23:59:59+05:30`;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  // Get employees scoped by role
  let employeesQuery = supabaseAdmin
    .from("hr_profiles")
    .select("id, full_name, designation, department");

  if (profile.role === "manager") {
    employeesQuery = employeesQuery.eq("reporting_manager_id", user.id);
  }
  // admin and super_admin see all employees (no filter)

  const { data: employees } = await employeesQuery;
  if (!employees || employees.length === 0) {
    return NextResponse.json({
      summary: { totalEmployees: 0, presentToday: 0, absentToday: 0, onLeaveToday: 0, inFieldNow: 0 },
      attendance: { avgHoursWorked: 0, avgPunchInTime: "--", lateCount: 0, perfectAttendanceCount: 0 },
      employeeStats: [],
      trends: [],
      insights: [],
    });
  }

  const employeeIds = employees.map((e) => e.id);

  // Get all attendance for the period
  const { data: attendance } = await supabaseAdmin
    .from("hr_attendance")
    .select()
    .in("user_id", employeeIds)
    .gte("created_at", startStr)
    .lte("created_at", endStr);

  // Get today's attendance
  const { data: todayAttendance } = await supabaseAdmin
    .from("hr_attendance")
    .select()
    .in("user_id", employeeIds)
    .gte("created_at", today);

  // Get today's leave requests
  const { data: todayLeaves } = await supabaseAdmin
    .from("hr_leave_requests")
    .select()
    .in("user_id", employeeIds)
    .eq("status", "approved")
    .lte("start_date", today)
    .gte("end_date", today);

  // Get location logs for today (to determine who's in field)
  const { data: todayLocations } = await supabaseAdmin
    .from("hr_location_logs")
    .select("user_id")
    .in("user_id", employeeIds)
    .gte("captured_at", today);

  // Summary
  const presentTodayIds = new Set((todayAttendance || []).map((a) => a.user_id));
  const onLeaveTodayIds = new Set((todayLeaves || []).map((l) => l.user_id));
  const inFieldIds = new Set((todayLocations || []).filter((l) => {
    // Only count if they have an open session
    return (todayAttendance || []).some((a) => a.user_id === l.user_id && !a.punch_out_at);
  }).map((l) => l.user_id));

  const summary = {
    totalEmployees: employees.length,
    presentToday: presentTodayIds.size,
    absentToday: employees.length - presentTodayIds.size - onLeaveTodayIds.size,
    onLeaveToday: onLeaveTodayIds.size,
    inFieldNow: inFieldIds.size,
  };

  // Attendance stats
  const allRecords = attendance || [];
  let totalHours = 0;
  let recordsWithHours = 0;
  let lateCount = 0;
  const punchInMinutes: number[] = [];
  const workingDaysByEmployee = new Map<string, Set<string>>();
  const lateDaysByEmployee = new Map<string, number>();
  const hoursByEmployee = new Map<string, number>();

  for (const rec of allRecords) {
    const day = rec.created_at.split("T")[0];

    // Track working days
    if (!workingDaysByEmployee.has(rec.user_id)) workingDaysByEmployee.set(rec.user_id, new Set());
    workingDaysByEmployee.get(rec.user_id)!.add(day);

    if (rec.punch_in_at && rec.punch_out_at) {
      const dur = (new Date(rec.punch_out_at).getTime() - new Date(rec.punch_in_at).getTime()) / 3600000;
      totalHours += dur;
      recordsWithHours++;
      hoursByEmployee.set(rec.user_id, (hoursByEmployee.get(rec.user_id) || 0) + dur);
    }

    if (rec.punch_in_at) {
      const punchIn = new Date(rec.punch_in_at);
      const mins = punchIn.getHours() * 60 + punchIn.getMinutes();
      punchInMinutes.push(mins);
      // Late if punch-in after 10:00 AM
      if (mins > 600) {
        lateCount++;
        lateDaysByEmployee.set(rec.user_id, (lateDaysByEmployee.get(rec.user_id) || 0) + 1);
      }
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

  // Count total working days in the period (weekdays)
  let totalWorkDays = 0;
  const d = new Date(startDate);
  while (d <= endDate) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) totalWorkDays++;
    d.setDate(d.getDate() + 1);
  }

  const perfectAttendanceCount = employees.filter((e) => {
    const days = workingDaysByEmployee.get(e.id);
    return days && days.size >= totalWorkDays && (lateDaysByEmployee.get(e.id) || 0) === 0;
  }).length;

  const attendanceStats = {
    avgHoursWorked: avgHours,
    avgPunchInTime,
    lateCount,
    perfectAttendanceCount,
  };

  // Per-employee stats
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

  // Daily trends (present count per day)
  const dayMap = new Map<string, Set<string>>();
  for (const rec of allRecords) {
    const day = rec.created_at.split("T")[0];
    if (!dayMap.has(day)) dayMap.set(day, new Set());
    dayMap.get(day)!.add(rec.user_id);
  }

  const trends: { date: string; count: number }[] = [];
  const trendDate = new Date(startDate);
  while (trendDate <= endDate) {
    const ds = trendDate.toISOString().split("T")[0];
    const dow = trendDate.getDay();
    if (dow !== 0 && dow !== 6) {
      trends.push({ date: ds, count: dayMap.get(ds)?.size || 0 });
    }
    trendDate.setDate(trendDate.getDate() + 1);
  }

  // Insights (rule-based)
  const insights: { type: "warning" | "positive" | "info"; text: string }[] = [];

  for (const emp of employeeStats) {
    if (emp.lateDays > 3) {
      insights.push({ type: "warning", text: `${emp.name} has been late ${emp.lateDays} times` });
    }
    if (emp.avgHours > 0 && emp.avgHours < 6) {
      insights.push({ type: "warning", text: `${emp.name} averages only ${emp.avgHours}h/day` });
    }
  }

  if (perfectAttendanceCount > 0) {
    insights.push({ type: "positive", text: `${perfectAttendanceCount} employee(s) with perfect attendance` });
  }

  if (avgHours >= 8) {
    insights.push({ type: "positive", text: `Team averages ${avgHours}h/day — above target` });
  }

  if (summary.inFieldNow > 0) {
    insights.push({ type: "info", text: `${summary.inFieldNow} team member(s) currently in the field` });
  }

  return NextResponse.json({
    summary,
    attendance: attendanceStats,
    employeeStats,
    trends,
    insights,
  });
}
