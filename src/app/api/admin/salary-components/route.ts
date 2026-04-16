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

  return { id: user.id };
}

// GET: list salary components
export async function GET(req: NextRequest) {
  const admin = await verifyUniversalAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const all = url.searchParams.get("all") === "true";

  let query = supabaseAdmin.from("hr_salary_components").select("*").order("type").order("name");
  if (!all) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ components: data || [] });
}

// POST: add new component
export async function POST(req: NextRequest) {
  const admin = await verifyUniversalAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, type, is_statutory, calc_rule, description } = body;
  if (!name || !type) {
    return NextResponse.json({ error: "name and type are required" }, { status: 400 });
  }
  if (!["earning", "deduction"].includes(type)) {
    return NextResponse.json({ error: "type must be 'earning' or 'deduction'" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("hr_salary_components")
    .insert({
      name: name.trim(),
      type,
      is_statutory: is_statutory || false,
      calc_rule: calc_rule || null,
      description: description || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ component: data });
}

// PATCH: update component
export async function PATCH(req: NextRequest) {
  const admin = await verifyUniversalAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  // Only allow safe fields
  const allowed: Record<string, unknown> = {};
  if (updates.name !== undefined) allowed.name = updates.name.trim();
  if (updates.type !== undefined) allowed.type = updates.type;
  if (updates.is_statutory !== undefined) allowed.is_statutory = updates.is_statutory;
  if (updates.calc_rule !== undefined) allowed.calc_rule = updates.calc_rule;
  if (updates.description !== undefined) allowed.description = updates.description;
  if (updates.is_active !== undefined) allowed.is_active = updates.is_active;

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("hr_salary_components")
    .update(allowed)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ component: data });
}
