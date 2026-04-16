import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/** Recursively get all employee IDs in a manager's reporting tree */
async function getSubtreeIds(managerId: string): Promise<Set<string>> {
  const result = new Set<string>();
  const queue = [managerId];

  while (queue.length > 0) {
    const batch = queue.splice(0, 50);
    const { data } = await supabaseAdmin
      .from("hr_profiles")
      .select("id")
      .in("reporting_manager_id", batch)
      .is("deactivated_at", null);

    for (const p of data || []) {
      if (!result.has(p.id)) {
        result.add(p.id);
        queue.push(p.id);
      }
    }
  }

  return result;
}

export async function POST(req: NextRequest) {
  // Auth
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.split(" ")[1]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify caller is active admin or manager
  const { data: callerProfile } = await supabaseAdmin
    .from("hr_profiles")
    .select("id, role, designation, project_id")
    .eq("id", user.id)
    .is("deactivated_at", null)
    .single();

  if (!callerProfile || !["manager", "admin", "super_admin"].includes(callerProfile.role)) {
    return NextResponse.json({ error: "Manager or admin access required" }, { status: 403 });
  }

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { user_id, date, status } = body;
  if (!user_id || !date || !status) {
    return NextResponse.json({ error: "user_id, date, and status are required" }, { status: 400 });
  }

  const validStatuses = ["absent", "present", "half-day", "late", "lwp"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
  }

  // Verify target employee exists
  const { data: targetProfile } = await supabaseAdmin
    .from("hr_profiles")
    .select("id, project_id, full_name, reporting_manager_id")
    .eq("id", user_id)
    .is("deactivated_at", null)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // Authorization scoping
  const isUniversal = callerProfile.role === "super_admin" ||
    (callerProfile.designation?.toLowerCase().includes("hr") &&
      ["admin", "super_admin"].includes(callerProfile.role));

  if (!isUniversal) {
    if (callerProfile.role === "manager") {
      // Manager can only override employees in their reporting tree
      const subtreeIds = await getSubtreeIds(callerProfile.id);
      if (!subtreeIds.has(user_id)) {
        return NextResponse.json({ error: "You can only override attendance for employees in your team" }, { status: 403 });
      }
    } else {
      // Regular admin — scoped to their project
      if (targetProfile.project_id !== callerProfile.project_id) {
        return NextResponse.json({ error: "You can only manage employees in your project" }, { status: 403 });
      }
    }
  }

  // Find attendance records for this date
  const startIso = `${date}T00:00:00+05:30`;
  const endIso = `${date}T23:59:59+05:30`;

  const { data: existing } = await supabaseAdmin
    .from("hr_attendance")
    .select("id")
    .eq("user_id", user_id)
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  if (existing && existing.length > 0) {
    // Update all records for this date to the new status
    const { error } = await supabaseAdmin
      .from("hr_attendance")
      .update({ status })
      .eq("user_id", user_id)
      .gte("created_at", startIso)
      .lte("created_at", endIso);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // Insert a new attendance record marked with the override status
    const { error } = await supabaseAdmin
      .from("hr_attendance")
      .insert({
        user_id,
        created_at: startIso,
        punch_in_at: startIso,
        status,
        synced: true,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Notify the employee
  const roleLabel = callerProfile.role === "manager" ? "manager" : "admin";
  const statusLabel = status === "lwp" ? "LWP" : status.charAt(0).toUpperCase() + status.slice(1);
  await supabaseAdmin.from("hr_notifications").insert({
    user_id,
    title: "Attendance Updated",
    body: `Your attendance for ${date} has been marked as "${statusLabel}" by your ${roleLabel}.`,
    type: "attendance_override",
  });

  return NextResponse.json({ success: true, message: `Attendance for ${targetProfile.full_name} on ${date} marked as ${statusLabel}` });
}
