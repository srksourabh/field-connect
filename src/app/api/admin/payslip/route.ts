import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET: fetch payslip data for a payroll record
// Auth: admin/HR can view any; employees can view their own
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

  const { data: callerProfile } = await supabaseAdmin
    .from("hr_profiles")
    .select("id, role, designation, full_name")
    .eq("id", user.id)
    .is("deactivated_at", null)
    .single();

  if (!callerProfile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const payrollId = url.searchParams.get("payroll_id");
  const employeeId = url.searchParams.get("employee_id");
  const month = url.searchParams.get("month");

  let payrollQuery;

  if (payrollId) {
    payrollQuery = supabaseAdmin
      .from("hr_payroll")
      .select("*")
      .eq("id", payrollId)
      .single();
  } else if (employeeId && month) {
    payrollQuery = supabaseAdmin
      .from("hr_payroll")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("month", month)
      .single();
  } else {
    return NextResponse.json({ error: "payroll_id or (employee_id + month) required" }, { status: 400 });
  }

  const { data: payroll, error } = await payrollQuery;
  if (error || !payroll) {
    return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });
  }

  // Auth check: employees can only view their own
  const isAdmin = ["admin", "super_admin"].includes(callerProfile.role);
  const isHR = callerProfile.designation?.toLowerCase().includes("hr") && isAdmin;
  const isOwn = payroll.employee_id === user.id;

  if (!isAdmin && !isHR && !isOwn) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get employee profile with payroll-relevant fields
  const { data: empProfile } = await supabaseAdmin
    .from("hr_profiles")
    .select("full_name, designation, department, project_id, employee_code, date_of_joining, uan_number, kyc_data")
    .eq("id", payroll.employee_id)
    .single();

  const kyc = (empProfile?.kyc_data as Record<string, string> | null) || {};
  const panRaw: string = kyc.pan || "";
  const panMasked = panRaw.length >= 4
    ? panRaw.slice(0, -4).replace(/./g, "X") + panRaw.slice(-4)
    : panRaw;
  const accountRaw: string = kyc.account_no || "";
  const accountMasked = accountRaw.length > 4
    ? "X".repeat(accountRaw.length - 4) + accountRaw.slice(-4)
    : accountRaw;

  return NextResponse.json({
    payslip: {
      ...payroll,
      employee_name: empProfile?.full_name || "Unknown",
      designation: empProfile?.designation || "",
      department: empProfile?.department || "",
      project: empProfile?.project_id || "",
      employee_code: empProfile?.employee_code || "",
      date_of_joining: empProfile?.date_of_joining || "",
      uan_number: empProfile?.uan_number || "",
      pan_masked: panMasked,
      bank_name: kyc.bank_name || "",
      account_masked: accountMasked,
      ifsc: kyc.ifsc || "",
    },
  });
}
