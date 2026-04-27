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

// PUT: mark payroll records as paid with a payment date
export async function PUT(req: NextRequest) {
  const admin = await verifyUniversalAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { month, employee_ids, payment_date } = body as {
    month: string;
    employee_ids: string[];
    payment_date: string;
  };

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month required (YYYY-MM)" }, { status: 400 });
  }
  if (!employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
    return NextResponse.json({ error: "employee_ids[] required" }, { status: 400 });
  }
  if (!payment_date || !/^\d{4}-\d{2}-\d{2}$/.test(payment_date)) {
    return NextResponse.json({ error: "payment_date required (YYYY-MM-DD)" }, { status: 400 });
  }

  const { error, count } = await supabaseAdmin
    .from("hr_payroll")
    .update({ status: "paid", payment_date, updated_at: new Date().toISOString() })
    .in("employee_id", employee_ids)
    .eq("month", month)
    .eq("status", "processed");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, updated: count ?? employee_ids.length });
}
