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

// GET: salary structure + payroll preferences for a specific employee
export async function GET(req: NextRequest) {
  const admin = await verifyUniversalAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employee_id");

  if (!employeeId) {
    return NextResponse.json({ error: "employee_id is required" }, { status: 400 });
  }

  const [{ data: salaryData, error }, { data: profileData }] = await Promise.all([
    supabaseAdmin
      .from("hr_employee_salary")
      .select("id, employee_id, component_id, amount, effective_from, effective_to")
      .eq("employee_id", employeeId)
      .is("effective_to", null)
      .order("component_id"),
    supabaseAdmin
      .from("hr_profiles")
      .select("tds_regime, pf_opted_out, uan_number")
      .eq("id", employeeId)
      .single(),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    salary: salaryData || [],
    payroll_prefs: {
      tds_regime: profileData?.tds_regime || "new",
      pf_opted_out: profileData?.pf_opted_out || false,
      uan_number: profileData?.uan_number || "",
    },
  });
}

// POST: bulk upsert salary components for an employee
export async function POST(req: NextRequest) {
  const admin = await verifyUniversalAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { employee_id, components } = body as {
    employee_id: string;
    components: { component_id: string; amount: number }[];
  };

  if (!employee_id || !components || !Array.isArray(components)) {
    return NextResponse.json({ error: "employee_id and components[] are required" }, { status: 400 });
  }

  // Verify employee exists
  const { data: emp } = await supabaseAdmin
    .from("hr_profiles")
    .select("id")
    .eq("id", employee_id)
    .is("deactivated_at", null)
    .single();

  if (!emp) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  // Close existing active entries for these components
  const componentIds = components.map((c) => c.component_id);

  if (componentIds.length > 0) {
    await supabaseAdmin
      .from("hr_employee_salary")
      .update({ effective_to: today, updated_at: new Date().toISOString() })
      .eq("employee_id", employee_id)
      .is("effective_to", null)
      .in("component_id", componentIds);
  }

  // Insert new entries (skip zero amounts — no point storing ₹0 components)
  const newEntries = components
    .filter((c) => c.amount > 0)
    .map((c) => ({
      employee_id,
      component_id: c.component_id,
      amount: c.amount,
      effective_from: today,
    }));

  if (newEntries.length > 0) {
    const { error } = await supabaseAdmin
      .from("hr_employee_salary")
      .insert(newEntries);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, saved: newEntries.length });
}

// PATCH: update payroll preferences (tds_regime, pf_opted_out, uan_number) on hr_profiles
export async function PATCH(req: NextRequest) {
  const admin = await verifyUniversalAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { employee_id, tds_regime, pf_opted_out, uan_number } = body as {
    employee_id: string;
    tds_regime?: string;
    pf_opted_out?: boolean;
    uan_number?: string;
  };

  if (!employee_id) return NextResponse.json({ error: "employee_id required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (tds_regime === "old" || tds_regime === "new") updates.tds_regime = tds_regime;
  if (typeof pf_opted_out === "boolean") updates.pf_opted_out = pf_opted_out;
  if (typeof uan_number === "string") updates.uan_number = uan_number || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("hr_profiles")
    .update(updates)
    .eq("id", employee_id)
    .is("deactivated_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
