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
  const departmentId = searchParams.get("department_id");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  let query = supabaseAdmin
    .from("saudi_employees")
    .select("*, saudi_departments!inner(*)")
    .order("full_name");

  if (departmentId) query = query.eq("department_id", departmentId);
  if (status) query = query.eq("employment_status", status);
  if (search) query = query.ilike("full_name", `%${search}%`);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ employees: data });
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
    .from("saudi_employees")
    .insert({
      department_id: body.department_id,
      manager_employee_id: body.manager_employee_id,
      iqama_number_enc: body.iqama_number_enc,
      passport_number_enc: body.passport_number_enc,
      bank_iban_enc: body.bank_iban_enc,
      nationality: body.nationality,
      full_name: body.full_name,
      employment_status: body.employment_status ?? "active",
      hire_date: body.hire_date,
      gosi_registration_date: body.gosi_registration_date,
      gosi_system: body.gosi_system,
      salary_basic: body.salary_basic,
      salary_housing: body.salary_housing ?? 0,
      salary_transport: body.salary_transport ?? 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ employee: data }, { status: 201 });
}
