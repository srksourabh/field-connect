import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const VALID_TYPES = ["project", "department", "designation"];

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("hr_profiles")
    .select("role, project_id, designation")
    .eq("id", user.id)
    .is("deactivated_at", null)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) return null;

  const isUniversal = profile.role === "super_admin" ||
    (profile.designation?.toLowerCase().includes("hr") ?? false);

  return { id: user.id, role: profile.role, isUniversal };
}

// GET: list master data items by type
export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const all = url.searchParams.get("all") === "true";

  if (type && !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  let query = supabaseAdmin.from("hr_master_data").select("*").order("name");
  if (type) query = query.eq("type", type);
  if (!all) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Include employee counts per item
  const { data: profiles } = await supabaseAdmin
    .from("hr_profiles")
    .select("project_id, department, designation")
    .is("deactivated_at", null);

  const counts: Record<string, number> = {};
  for (const p of profiles || []) {
    if (p.project_id) counts[`project:${p.project_id}`] = (counts[`project:${p.project_id}`] || 0) + 1;
    if (p.department) counts[`department:${p.department}`] = (counts[`department:${p.department}`] || 0) + 1;
    if (p.designation) counts[`designation:${p.designation}`] = (counts[`designation:${p.designation}`] || 0) + 1;
  }

  const items = (data || []).map((item: { id: string; type: string; name: string; is_active: boolean; created_at: string }) => ({
    ...item,
    employee_count: counts[`${item.type}:${item.name}`] || 0,
  }));

  return NextResponse.json({ items });
}

// POST: create a new master data item
export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!admin.isUniversal) return NextResponse.json({ error: "Super admin or HR only" }, { status: 403 });

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { type, name, external_url } = body;
  if (!type || !VALID_TYPES.includes(type) || !name?.trim()) {
    return NextResponse.json({ error: "type and name are required" }, { status: 400 });
  }

  const insertData: Record<string, unknown> = { type, name: name.trim() };
  if (external_url !== undefined) insertData.external_url = external_url || null;

  const { data, error } = await supabaseAdmin
    .from("hr_master_data")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Item already exists" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}

// PATCH: update a master data item
export async function PATCH(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!admin.isUniversal) return NextResponse.json({ error: "Super admin or HR only" }, { status: 403 });

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { id, name, is_active, external_url } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (is_active !== undefined) updates.is_active = is_active;
  if (external_url !== undefined) updates.external_url = external_url || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("hr_master_data")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ item: data });
}

// DELETE: soft-delete (set is_active=false)
export async function DELETE(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!admin.isUniversal) return NextResponse.json({ error: "Super admin or HR only" }, { status: 403 });

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { id } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("hr_master_data")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
