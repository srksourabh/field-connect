import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

  // Get caller profile
  const { data: profile } = await supabaseAdmin
    .from("hr_profiles")
    .select("role, id, project_id, reporting_manager_id, designation")
    .eq("id", user.id)
    .is("deactivated_at", null)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const isUniversal = profile.role === "super_admin" ||
    (profile.designation?.toLowerCase().includes("hr") ?? false);

  // Fetch all active profiles (project-scoped for non-universal users)
  let profilesQuery = supabaseAdmin
    .from("hr_profiles")
    .select("id, full_name, designation, phone, email, avatar_url, role, reporting_manager_id, project_id")
    .is("deactivated_at", null);

  if (!isUniversal && profile.project_id) {
    profilesQuery = profilesQuery.eq("project_id", profile.project_id);
  }

  const { data: allProfiles } = await profilesQuery;
  if (!allProfiles || allProfiles.length === 0) {
    return NextResponse.json({ employees: [] });
  }

  // Apply same scoping as team view: same level (peers) + all descendants
  // Universal users (super_admin / HR) see everyone
  let visibleProfiles = allProfiles;

  if (!isUniversal) {
    // Build child map
    const childMap: Record<string, string[]> = {};
    for (const p of allProfiles) {
      if (p.reporting_manager_id) {
        if (!childMap[p.reporting_manager_id]) {
          childMap[p.reporting_manager_id] = [];
        }
        childMap[p.reporting_manager_id].push(p.id);
      }
    }

    // Peers: same reporting_manager_id as caller
    const peers = allProfiles.filter((p) => p.reporting_manager_id === profile.reporting_manager_id);
    if (peers.length === 0) {
      const self = allProfiles.find((p) => p.id === profile.id);
      if (self) peers.push(self);
    }

    // BFS to collect all descendants of peers
    const visibleIds = new Set<string>();
    const queue: string[] = [];

    for (const peer of peers) {
      visibleIds.add(peer.id);
      queue.push(peer.id);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = childMap[current] || [];
      for (const childId of children) {
        if (!visibleIds.has(childId)) {
          visibleIds.add(childId);
          queue.push(childId);
        }
      }
    }

    visibleProfiles = allProfiles.filter((p) => visibleIds.has(p.id));
  }

  // Exclude caller themselves from the map (you don't need to see your own location)
  visibleProfiles = visibleProfiles.filter((p) => p.id !== profile.id);

  if (visibleProfiles.length === 0) {
    return NextResponse.json({ employees: [] });
  }

  const employeeIds = visibleProfiles.map((e) => e.id);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const todayIST = `${today}T00:00:00+05:30`;

  // Get today's attendance for all employees
  const { data: attendance } = await supabaseAdmin
    .from("hr_attendance")
    .select()
    .in("user_id", employeeIds)
    .gte("created_at", todayIST);

  // Get latest location logs for today
  const { data: locationLogs } = await supabaseAdmin
    .from("hr_location_logs")
    .select()
    .in("user_id", employeeIds)
    .gte("captured_at", todayIST)
    .order("captured_at", { ascending: false });

  // Build per-employee result
  const result = visibleProfiles.map((emp) => {
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

    // Build GPS trail from today's logs (ascending order for polyline)
    const trail = empLogs
      .filter((l) => l.lat != null && l.long != null)
      .reverse()
      .map((l) => ({ lat: l.lat, lng: l.long }));

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
      punchedIn: hasOpenSession,
      trail,
    };
  });

  return NextResponse.json({ employees: result });
}
