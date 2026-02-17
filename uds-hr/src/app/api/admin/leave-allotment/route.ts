import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("hr_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) return null;
  return user;
}

// GET: All employees + their leave balances for current year
export async function GET(request: Request) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const year = parseInt(url.searchParams.get("year") || String(new Date().getFullYear()));

  const { data: employees } = await supabaseAdmin
    .from("hr_profiles")
    .select("id, full_name, designation, department, role")
    .order("full_name");

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
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const year = body.year || new Date().getFullYear();
  const sickTotal = body.sick_total ?? 5;
  const casualTotal = body.casual_total ?? 10;
  const privilegeTotal = body.privilege_total ?? 15;

  // Get all employees
  const { data: employees } = await supabaseAdmin
    .from("hr_profiles")
    .select("id");

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
  }));

  const { error } = await supabaseAdmin
    .from("hr_leave_balances")
    .insert(records);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: `Created ${missing.length} balance records`, created: missing.length });
}

// PATCH: Update individual employee balance
export async function PATCH(request: Request) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { balance_id, ...updates } = body;

  if (!balance_id) {
    return NextResponse.json({ error: "balance_id required" }, { status: 400 });
  }

  const allowedFields = [
    "sick_leave_total", "sick_leave_used",
    "casual_leave_total", "casual_leave_used",
    "compoff_total", "compoff_used",
    "privilege_leave_total", "privilege_leave_used",
  ];

  const filtered: Record<string, number> = {};
  for (const key of allowedFields) {
    if (key in updates && typeof updates[key] === "number") {
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
