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
    .select("role, project_id, designation")
    .eq("id", user.id)
    .is("deactivated_at", null)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const todayIST = `${today}T00:00:00+05:30`;

  // Get employees (project-scoped for regular admins)
  const isUniversal = profile.role === "super_admin" ||
    (profile.designation?.toLowerCase().includes("hr") ?? false);

  let empQuery = supabaseAdmin
    .from("hr_profiles")
    .select("id, full_name, designation, phone, email, avatar_url, department")
    .is("deactivated_at", null);

  if (!isUniversal && profile.project_id) {
    empQuery = empQuery.eq("project_id", profile.project_id);
  }

  const { data: employees } = await empQuery;

  if (!employees) return NextResponse.json({ employees: [], summary: {} });

  const employeeIds = employees.map((e) => e.id);

  // Get today's attendance
  const { data: attendance } = await supabaseAdmin
    .from("hr_attendance")
    .select()
    .in("user_id", employeeIds)
    .gte("created_at", todayIST);

  // Get today's approved leaves
  const { data: leaves } = await supabaseAdmin
    .from("hr_leave_requests")
    .select("user_id")
    .in("user_id", employeeIds)
    .eq("status", "approved")
    .lte("start_date", today)
    .gte("end_date", today);

  // Get ALL today's location logs (for trails)
  const { data: locationLogs } = await supabaseAdmin
    .from("hr_location_logs")
    .select()
    .in("user_id", employeeIds)
    .gte("captured_at", todayIST)
    .order("captured_at", { ascending: true });

  const leaveUserIds = new Set((leaves || []).map((l) => l.user_id));

  // Build per-employee data
  const result = employees.map((emp) => {
    const empAttendance = (attendance || []).filter((a) => a.user_id === emp.id);
    const hasOpenSession = empAttendance.some((a) => !a.punch_out_at);
    const empLogs = (locationLogs || []).filter((l) => l.user_id === emp.id);
    const latestLog = empLogs.length > 0 ? empLogs[empLogs.length - 1] : null;

    // Calculate total hours today
    let totalHoursToday = 0;
    for (const a of empAttendance) {
      if (a.punch_in_at) {
        const end = a.punch_out_at ? new Date(a.punch_out_at).getTime() : Date.now();
        totalHoursToday += (end - new Date(a.punch_in_at).getTime()) / 3600000;
      }
    }

    // Calculate total distance from logs
    let totalDistanceKm = 0;
    for (let i = 1; i < empLogs.length; i++) {
      totalDistanceKm += haversineKm(
        empLogs[i - 1].lat, empLogs[i - 1].long,
        empLogs[i].lat, empLogs[i].long
      );
    }

    let status: "online" | "away" | "on_leave" | "offline" = "offline";
    if (leaveUserIds.has(emp.id)) {
      status = "on_leave";
    } else if (hasOpenSession) {
      if (latestLog) {
        const age = Date.now() - new Date(latestLog.captured_at).getTime();
        status = age < 15 * 60 * 1000 ? "online" : "away";
      } else {
        status = "away";
      }
    }

    return {
      id: emp.id,
      name: emp.full_name,
      designation: emp.designation,
      department: emp.department,
      phone: emp.phone,
      email: emp.email,
      avatar_url: emp.avatar_url,
      lat: latestLog?.lat ?? null,
      lng: latestLog?.long ?? null,
      status,
      totalHoursToday: Math.round(totalHoursToday * 10) / 10,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      trail: empLogs.map((l) => ({ lat: l.lat, lng: l.long, time: l.captured_at })),
      punchedInSince: hasOpenSession
        ? empAttendance.find((a) => !a.punch_out_at)?.punch_in_at ?? null
        : null,
    };
  });

  // Summary
  const presentCount = (attendance || []).length > 0
    ? new Set((attendance || []).map((a) => a.user_id)).size
    : 0;

  return NextResponse.json({
    employees: result,
    summary: {
      total: employees.length,
      present: presentCount,
      onLeave: leaveUserIds.size,
      absent: Math.max(0, employees.length - presentCount - leaveUserIds.size),
    },
  });
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
