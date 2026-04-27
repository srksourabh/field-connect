import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function verifyAnyUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.split(" ")[1];
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return !!user;
}

async function verifyAdmin(req: NextRequest) {
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

const COMPANY_KEYS = ["company_full_name", "company_address", "company_pf_no", "company_esic_code"];

// GET: return all company config keys — any authenticated user (needed for payslip PDF)
export async function GET(req: NextRequest) {
  const ok = await verifyAnyUser(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("hr_config")
    .select("key, value")
    .in("key", COMPANY_KEYS);

  const settings: Record<string, string> = {};
  for (const row of data || []) {
    settings[row.key] = row.value || "";
  }
  return NextResponse.json({ settings });
}

// PUT: upsert company config values
export async function PUT(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: Record<string, string>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rows = COMPANY_KEYS
    .filter((k) => k in body)
    .map((k) => ({ key: k, value: String(body[k] || ""), updated_by: admin.id, updated_at: new Date().toISOString() }));

  if (rows.length === 0) return NextResponse.json({ error: "No valid keys provided" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("hr_config")
    .upsert(rows, { onConflict: "key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
