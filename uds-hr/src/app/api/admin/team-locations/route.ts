import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  // Verify auth from header
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check role
  const { data: profile } = await supabaseAdmin
    .from("hr_profiles")
    .select("role, id")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin", "manager"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get employees (managers see their reports, admins see all)
  let employeesQuery = supabaseAdmin
    .from("hr_profiles")
    .select("id, full_name, designation, phone, email, avatar_url, role");

  if (profile.role === "manager") {
    employeesQuery = employeesQuery.eq("reporting_manager_id", user.id);
  }

  const { data: employees } = await employeesQuery;
  if (!employees || employees.length === 0) {
    return NextResponse.json({ employees: [] });
  }

  const employeeIds = employees.map((e) => e.id);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  // Get today's attendance for all employees
  const { data: attendance } = await supabaseAdmin
    .from("hr_attendance")
    .select()
    .in("user_id", employeeIds)
    .gte("created_at", today);

  // Get latest location logs for today
  const { data: locationLogs } = await supabaseAdmin
    .from("hr_location_logs")
    .select()
    .in("user_id", employeeIds)
    .gte("captured_at", today)
    .order("captured_at", { ascending: false });

  // Build per-employee result
  const result = employees.map((emp) => {
    const empAttendance = (attendance || []).filter((a) => a.user_id === emp.id);
    const hasOpenSession = empAttendance.some((a) => !a.punch_out_at);
    const latestAttendance = empAttendance[empAttendance.length - 1];

    const empLogs = (locationLogs || []).filter((l) => l.user_id === emp.id);
    const latestLog = empLogs[0]; // already ordered desc

    let status: "online" | "away" | "offline" = "offline";
    let lastSeen = "No record";

    if (hasOpenSession && latestLog) {
      const logAge = Date.now() - new Date(latestLog.captured_at).getTime();
      if (logAge < 15 * 60 * 1000) {
        status = "online";
        lastSeen = "Just now";
      } else {
        status = "away";
        const mins = Math.floor(logAge / 60000);
        lastSeen = mins < 60 ? `${mins} min ago` : `${Math.floor(mins / 60)}h ago`;
      }
    } else if (latestAttendance) {
      if (latestAttendance.punch_out_at) {
        const outTime = new Date(latestAttendance.punch_out_at);
        lastSeen = `Left at ${outTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
      }
    }

    return {
      id: emp.id,
      name: emp.full_name,
      designation: emp.designation,
      phone: emp.phone,
      email: emp.email,
      avatar_url: emp.avatar_url,
      lat: latestLog?.lat ?? null,
      lng: latestLog?.long ?? null,
      status,
      lastSeen,
    };
  });

  return NextResponse.json({ employees: result });
}
