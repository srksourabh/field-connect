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

function sanitizeCell(value: string): string {
  let s = value.replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s}"`;
}

// GET: CSV export of payroll for accounts department
// ?month=2026-04&status=processed (or paid or all)
export async function GET(req: NextRequest) {
  const admin = await verifyUniversalAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const month = url.searchParams.get("month");
  const statusFilter = url.searchParams.get("status") || "all";

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month required (YYYY-MM)" }, { status: 400 });
  }

  let payrollQuery = supabaseAdmin
    .from("hr_payroll")
    .select("employee_id, gross_earnings, total_deductions, net_payable, status, payment_date, tds_amount, employer_pf, employer_esi")
    .eq("month", month);

  if (statusFilter !== "all") {
    payrollQuery = payrollQuery.eq("status", statusFilter);
  }

  const { data: payrolls } = await payrollQuery.limit(500);

  if (!payrolls || payrolls.length === 0) {
    return NextResponse.json({ error: "No payroll records found" }, { status: 404 });
  }

  const empIds = payrolls.map((p) => p.employee_id);

  const { data: profiles } = await supabaseAdmin
    .from("hr_profiles")
    .select("id, full_name, designation, department, employee_code, kyc_data")
    .in("id", empIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  const headers = [
    "Employee Name", "Employee Code", "Designation", "Department",
    "Bank Name", "Account Number", "IFSC Code",
    "Gross (₹)", "Deductions (₹)", "TDS (₹)", "Net Payable (₹)",
    "Employer PF (₹)", "Employer ESI (₹)",
    "Status", "Payment Date"
  ];

  const rows = payrolls.map((p) => {
    const prof = profileMap.get(p.employee_id);
    const kyc = (prof?.kyc_data as Record<string, string> | null) || {};
    return [
      prof?.full_name || "",
      prof?.employee_code || "",
      prof?.designation || "",
      prof?.department || "",
      kyc.bank_name || "",
      kyc.account_no || "",
      kyc.ifsc || "",
      String(p.gross_earnings),
      String(p.total_deductions),
      String(p.tds_amount || 0),
      String(p.net_payable),
      String(p.employer_pf || 0),
      String(p.employer_esi || 0),
      p.status,
      p.payment_date || "",
    ].map(sanitizeCell).join(",");
  });

  const csv = "﻿" + [headers.map(sanitizeCell).join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="payroll-${month}.csv"`,
    },
  });
}
