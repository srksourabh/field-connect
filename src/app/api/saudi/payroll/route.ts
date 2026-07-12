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

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = supabaseAdmin
    .from("saudi_payroll_runs")
    .select("*")
    .order("period_month", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ runs: data });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from("saudi_payroll_runs")
    .insert({
      period_month: body.period_month,
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const employeesResult = await supabaseAdmin
    .from("saudi_employees")
    .select("id, salary_basic, salary_housing, salary_transport, gosi_system")
    .eq("employment_status", "active");

  if (employeesResult.data) {
    const payslips = employeesResult.data.map((emp) => ({
      payroll_run_id: data.id,
      employee_id: emp.id,
      basic: Number(emp.salary_basic),
      housing: Number(emp.salary_housing),
      transport: Number(emp.salary_transport),
      overtime: 0,
      gosi_employee: 0,
      gosi_employer: 0,
      deductions: 0,
      net_pay: Number(emp.salary_basic) + Number(emp.salary_housing) + Number(emp.salary_transport),
    }));

    await supabaseAdmin.from("saudi_payslips").insert(payslips);
  }

  return NextResponse.json({ run: data }, { status: 201 });
}
