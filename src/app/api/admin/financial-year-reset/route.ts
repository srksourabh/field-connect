import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

  // Only super_admin can reset financial year
  const { data: callerProfile } = await supabaseAdmin
    .from("hr_profiles")
    .select("id, role")
    .eq("id", user.id)
    .is("deactivated_at", null)
    .single();

  if (!callerProfile || callerProfile.role !== "super_admin") {
    return NextResponse.json({ error: "Only super_admin can perform financial year reset" }, { status: 403 });
  }

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { new_fy_year, confirm } = body;

  if (!new_fy_year || typeof new_fy_year !== "number") {
    return NextResponse.json({ error: "new_fy_year (number) is required — e.g., 2026 for FY 2026-27" }, { status: 400 });
  }

  if (confirm !== true) {
    return NextResponse.json({
      error: "Set confirm: true to proceed. This will create fresh leave balances for the new financial year.",
      preview: true,
    }, { status: 400 });
  }

  // Get all active employees
  const { data: employees } = await supabaseAdmin
    .from("hr_profiles")
    .select("id")
    .is("deactivated_at", null);

  if (!employees || employees.length === 0) {
    return NextResponse.json({ error: "No active employees found" }, { status: 404 });
  }

  // Check which employees already have balances for the new year
  const { data: existingBalances } = await supabaseAdmin
    .from("hr_leave_balances")
    .select("user_id")
    .eq("year", new_fy_year);

  const existingIds = new Set((existingBalances || []).map((b) => b.user_id));
  const needsReset = employees.filter((e) => !existingIds.has(e.id));

  // Get default totals from previous year or use defaults
  const prevYear = new_fy_year - 1;
  const { data: prevBalances } = await supabaseAdmin
    .from("hr_leave_balances")
    .select("sick_leave_total, casual_leave_total, privilege_leave_total, wfh_total")
    .eq("year", prevYear)
    .limit(1)
    .maybeSingle();

  const sickTotal = prevBalances?.sick_leave_total ?? 5;
  const casualTotal = prevBalances?.casual_leave_total ?? 10;
  const privilegeTotal = prevBalances?.privilege_leave_total ?? 15;
  const wfhTotal = (prevBalances as Record<string, unknown>)?.wfh_total as number ?? 10;

  if (needsReset.length === 0) {
    return NextResponse.json({
      message: `All ${employees.length} employees already have balances for ${new_fy_year}`,
      created: 0,
      skipped: employees.length,
    });
  }

  // Create fresh balance records for the new year with all _used = 0
  const newRecords = needsReset.map((e) => ({
    user_id: e.id,
    year: new_fy_year,
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
    .insert(newRecords);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify all employees about the reset
  const notifications = employees.map((e) => ({
    user_id: e.id,
    title: "New Financial Year",
    body: `Your leave balances have been reset for FY ${new_fy_year}-${(new_fy_year + 1).toString().slice(-2)}. All leave counts start fresh.`,
    type: "fy_reset",
  }));

  await supabaseAdmin.from("hr_notifications").insert(notifications);

  return NextResponse.json({
    message: `Financial year reset complete for FY ${new_fy_year}-${(new_fy_year + 1).toString().slice(-2)}`,
    created: needsReset.length,
    skipped: employees.length - needsReset.length,
    defaults: { sick: sickTotal, casual: casualTotal, privilege: privilegeTotal, wfh: wfhTotal },
  });
}
