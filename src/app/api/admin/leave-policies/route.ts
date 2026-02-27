import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function verifyUniversalAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("hr_profiles")
    .select("role, designation")
    .eq("id", user.id)
    .is("deactivated_at", null)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) return null;

  const isUniversal = profile.role === "super_admin" ||
    (profile.designation?.toLowerCase().includes("hr") ?? false);

  if (!isUniversal) return null;

  return { id: user.id, role: profile.role };
}

// GET: list leave policies
export async function GET(req: NextRequest) {
  const admin = await verifyUniversalAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const all = url.searchParams.get("all") === "true";

  let query = supabaseAdmin.from("hr_leave_policies").select("*").order("name");
  if (!all) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Count employees per policy
  const { data: profiles } = await supabaseAdmin
    .from("hr_profiles")
    .select("leave_policy_id")
    .is("deactivated_at", null)
    .not("leave_policy_id", "is", null);

  const counts: Record<string, number> = {};
  for (const p of profiles || []) {
    if (p.leave_policy_id) counts[p.leave_policy_id] = (counts[p.leave_policy_id] || 0) + 1;
  }

  const policies = (data || []).map((pol: { id: string; name: string; sick_leave_count: number; casual_leave_count: number; privilege_leave_count: number; is_active: boolean; created_at: string }) => ({
    ...pol,
    employee_count: counts[pol.id] || 0,
  }));

  return NextResponse.json({ policies });
}

// POST: create a leave policy
export async function POST(req: NextRequest) {
  const admin = await verifyUniversalAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, sick_leave_count, casual_leave_count, privilege_leave_count } = body;
  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("hr_leave_policies")
    .insert({
      name: name.trim(),
      sick_leave_count: sick_leave_count ?? 0,
      casual_leave_count: casual_leave_count ?? 0,
      privilege_leave_count: privilege_leave_count ?? 0,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Policy name already exists" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ policy: data });
}

// PATCH: update a leave policy
export async function PATCH(req: NextRequest) {
  const admin = await verifyUniversalAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { id, name, sick_leave_count, casual_leave_count, privilege_leave_count, is_active } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (sick_leave_count !== undefined) updates.sick_leave_count = sick_leave_count;
  if (casual_leave_count !== undefined) updates.casual_leave_count = casual_leave_count;
  if (privilege_leave_count !== undefined) updates.privilege_leave_count = privilege_leave_count;
  if (is_active !== undefined) updates.is_active = is_active;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("hr_leave_policies")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ policy: data });
}
