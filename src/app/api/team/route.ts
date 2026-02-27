import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get caller's profile
  const { data: callerProfile } = await supabaseAdmin
    .from("hr_profiles")
    .select("id, role, project_id, reporting_manager_id, designation")
    .eq("id", user.id)
    .is("deactivated_at", null)
    .single();

  if (!callerProfile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const isUniversal =
    callerProfile.role === "super_admin" ||
    (callerProfile.designation?.toLowerCase().includes("hr") &&
      ["admin", "super_admin"].includes(callerProfile.role));

  // Fetch profiles — admins/super_admin/HR see all, others see own project only
  let query = supabaseAdmin
    .from("hr_profiles")
    .select("id, full_name, designation, reporting_manager_id, phone, city, department, project_id")
    .is("deactivated_at", null)
    .order("full_name");

  if (!isUniversal && callerProfile.project_id) {
    query = query.eq("project_id", callerProfile.project_id);
  }

  const { data: profiles, error: fetchError } = await query;

  if (fetchError || !profiles) {
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }

  // For admins: return all profiles (full tree)
  if (isUniversal) {
    return NextResponse.json({ profiles, scope: "full" });
  }

  // For non-admins: return peers (same reporting_manager_id) + all their descendants
  const callerManagerId = callerProfile.reporting_manager_id;

  // Find peers: everyone with the same reporting_manager_id as the caller
  const peers = profiles.filter((p) => p.reporting_manager_id === callerManagerId);

  // If no peers found (shouldn't happen — caller is among them), include at least the caller
  if (peers.length === 0) {
    const self = profiles.find((p) => p.id === callerProfile.id);
    if (self) peers.push(self);
  }

  // Build a childMap for fast descendant lookup
  const childMap: Record<string, string[]> = {};
  for (const p of profiles) {
    if (p.reporting_manager_id) {
      if (!childMap[p.reporting_manager_id]) {
        childMap[p.reporting_manager_id] = [];
      }
      childMap[p.reporting_manager_id].push(p.id);
    }
  }

  // Collect all descendants of peers using BFS
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

  const filtered = profiles.filter((p) => visibleIds.has(p.id));

  return NextResponse.json({ profiles: filtered, scope: "subtree" });
}
