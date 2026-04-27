import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

interface AdminInfo {
  id: string;
  role: string;
  project_id: string | null;
  designation: string | null;
  isUniversal: boolean;
}

async function verifyAdmin(request: Request): Promise<AdminInfo | null> {
  const authHeader = request.headers.get("authorization");
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
    (profile.designation?.toLowerCase().includes("hr") &&
      ["admin", "super_admin"].includes(profile.role));

  return { id: user.id, role: profile.role, project_id: profile.project_id, designation: profile.designation, isUniversal };
}

// GET: All employees + their leave balances for current year
export async function GET(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const year = parseInt(url.searchParams.get("year") || String(new Date().getFullYear()));

  let empQuery = supabaseAdmin
    .from("hr_profiles")
    .select("id, full_name, designation, department, role")
    .is("deactivated_at", null)
    .order("full_name");

  // Project scoping for regular admins
  if (!admin.isUniversal && admin.project_id) {
    empQuery = empQuery.eq("project_id", admin.project_id);
  }

  const { data: employees } = await empQuery;

  if (!employees) return NextResponse.json({ employees: [] });

  const { data: balances } = await supabaseAdmin
    .from("hr_leave_balances")
    .select()
    .eq("year", year);

  const balanceMap = new Map((balances || []).map((b) => [b.user_id, b]));

  const result = employees.map((emp) => ({
    ...emp,
    balance: balanceMap.get(emp.id) || null,
  }));

  return NextResponse.json({ employees: result, year });
}

// POST: Bulk allot leaves for employees missing balance records
export async function POST(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const year = body.year || new Date().getFullYear();
  const sickTotal = body.sick_total ?? 5;
  const casualTotal = body.casual_total ?? 10;
  const privilegeTotal = body.privilege_total ?? 15;

  // Get employees (scoped by project for regular admins)
  let empQuery = supabaseAdmin.from("hr_profiles").select("id");
  if (!admin.isUniversal && admin.project_id) {
    empQuery = empQuery.eq("project_id", admin.project_id);
  }
  const { data: employees } = await empQuery;

  if (!employees) return NextResponse.json({ error: "No employees found" }, { status: 404 });

  // Get existing balances for the year
  const { data: existing } = await supabaseAdmin
    .from("hr_leave_balances")
    .select("user_id")
    .eq("year", year);

  const existingIds = new Set((existing || []).map((b) => b.user_id));
  const missing = employees.filter((e) => !existingIds.has(e.id));

  if (missing.length === 0) {
    return NextResponse.json({ message: "All employees already have balances", created: 0 });
  }

  const wfhTotal = body.wfh_total ?? 10;

  const records = missing.map((e) => ({
    user_id: e.id,
    year,
    sick_leave_total: sickTotal,
    sick_leave_used: 0,
    casual_leave_total: casualTotal,
    casual_leave_used: 0,
    compoff_total: 0,
    compoff_used: 0,
    privilege_leave_total: privilegeTotal,
    privilege_leave_used: 0,
    wfh_total: wfhTotal,
    wfh_used: 0,
  }));

  const { error } = await supabaseAdmin
    .from("hr_leave_balances")
    .insert(records);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: `Created ${missing.length} balance records`, created: missing.length });
}

// PUT: Bulk update leave balances for multiple employees
export async function PUT(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { balance_ids, updates } = body;
  if (!Array.isArray(balance_ids) || balance_ids.length === 0 || !updates) {
    return NextResponse.json({ error: "balance_ids (array) and updates required" }, { status: 400 });
  }

  // Super_admin/HR can edit all leave types; regular admins can only edit Comp Off
  const compoffFields = ["compoff_total", "compoff_used"];
  const allFields = [
    "sick_leave_total", "sick_leave_used",
    "casual_leave_total", "casual_leave_used",
    "compoff_total", "compoff_used",
    "privilege_leave_total", "privilege_leave_used",
    "wfh_total", "wfh_used",
  ];
  const allowedFields = admin.isUniversal ? allFields : compoffFields;

  const filtered: Record<string, number> = {};
  for (const key of allowedFields) {
    if (key in updates && typeof updates[key] === "number") {
      filtered[key] = updates[key];
    }
  }

  if (Object.keys(filtered).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Reject negative values
  for (const [key, value] of Object.entries(filtered)) {
    if (value < 0) {
      return NextResponse.json({ error: `${key} cannot be negative` }, { status: 400 });
    }
  }

  // For non-universal admins, verify all balance_ids belong to employees in their project
  if (!admin.isUniversal) {
    const { data: balanceRows } = await supabaseAdmin
      .from("hr_leave_balances")
      .select("id, user_id")
      .in("id", balance_ids);

    if (balanceRows) {
      const userIds = balanceRows.map((b) => b.user_id);
      const { data: profiles } = await supabaseAdmin
        .from("hr_profiles")
        .select("id, project_id")
        .in("id", userIds);

      const unauthorized = (profiles || []).filter((p) => p.project_id !== admin.project_id);
      if (unauthorized.length > 0) {
        return NextResponse.json({ error: "You can only manage leave balances for employees in your project" }, { status: 403 });
      }
    }
  }

  // Batch update using .in() instead of N+1 individual queries
  const { error, count } = await supabaseAdmin
    .from("hr_leave_balances")
    .update(filtered)
    .in("id", balance_ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: count ?? balance_ids.length, failed: 0 });
}

// PATCH: Update individual employee balance
export async function PATCH(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { balance_id, ...updates } = body;

  if (!balance_id) {
    return NextResponse.json({ error: "balance_id required" }, { status: 400 });
  }

  // Verify the balance record exists and belongs to a user in the admin's project
  const { data: balanceRow } = await supabaseAdmin
    .from("hr_leave_balances")
    .select("user_id")
    .eq("id", balance_id)
    .single();

  if (!balanceRow) {
    return NextResponse.json({ error: "Balance record not found" }, { status: 404 });
  }

  if (!admin.isUniversal) {
    const { data: targetProfile } = await supabaseAdmin
      .from("hr_profiles")
      .select("project_id")
      .eq("id", balanceRow.user_id)
      .single();
    if (!targetProfile || targetProfile.project_id !== admin.project_id) {
      return NextResponse.json({ error: "You can only manage employees in your project" }, { status: 403 });
    }
  }

  // Super_admin/HR can edit all leave types; regular admins can only edit Comp Off
  const compoffFields = ["compoff_total", "compoff_used"];
  const allFields = [
    "sick_leave_total", "sick_leave_used",
    "casual_leave_total", "casual_leave_used",
    "compoff_total", "compoff_used",
    "privilege_leave_total", "privilege_leave_used",
    "wfh_total", "wfh_used",
  ];
  const allowedFields = admin.isUniversal ? allFields : compoffFields;

  const filtered: Record<string, number> = {};
  for (const key of allowedFields) {
    if (key in updates && typeof updates[key] === "number") {
      if (updates[key] < 0) {
        return NextResponse.json({ error: `${key} cannot be negative` }, { status: 400 });
      }
      filtered[key] = updates[key];
    }
  }

  const { data, error } = await supabaseAdmin
    .from("hr_leave_balances")
    .update(filtered)
    .eq("id", balance_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ balance: data });
}
