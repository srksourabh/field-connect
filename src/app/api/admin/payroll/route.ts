import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { classifyGhost } from "@/lib/attendance-ghost";

async function verifyUniversalAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await supabaseAdmin
    .from("hr_profiles")
    .select("id, role, designation")
    .eq("id", user.id)
    .is("deactivated_at", null)
    .single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) return null;
  const isUniversal = profile.role === "super_admin" ||
    (profile.designation?.toLowerCase().includes("hr") ?? false);
  if (!isUniversal) return null;
  return { id: user.id };
}

/** Professional Tax slabs by state (monthly) */
function getProfessionalTax(state: string | null, grossSalary: number): number {
  if (grossSalary <= 10000) return 0;
  const s = (state || "").toLowerCase();
  if (s.includes("maharashtra")) return grossSalary > 10000 ? 200 : 0;
  if (s.includes("karnataka")) return grossSalary > 15000 ? 200 : 0;
  if (s.includes("west bengal")) return grossSalary > 10000 ? 150 : 0;
  if (s.includes("telangana")) return grossSalary > 15000 ? 200 : 0;
  if (s.includes("andhra")) return grossSalary > 15000 ? 200 : 0;
  return grossSalary > 10000 ? 200 : 0;
}

/** Count working days (Mon-Sat) in a month */
function getWorkingDays(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let working = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, month - 1, d).getDay() !== 0) working++;
  }
  return working;
}

/** TDS — New Tax Regime FY 2025-26 */
function calcTDSNew(annualGross: number): number {
  const taxable = Math.max(0, annualGross - 75000); // standard deduction
  if (taxable <= 400000) return 0;
  let tax = 0;
  const slabs: [number, number][] = [
    [400000, 0.05], [400000, 0.10], [400000, 0.15],
    [400000, 0.20], [400000, 0.25], [Infinity, 0.30],
  ];
  let remaining = taxable - 400000;
  for (const [band, rate] of slabs) {
    const chunk = Math.min(remaining, band);
    tax += chunk * rate;
    remaining -= chunk;
    if (remaining <= 0) break;
  }
  if (taxable <= 700000) tax = 0; // 87A rebate
  return Math.round(tax * 1.04 * 100) / 100; // 4% cess
}

/** TDS — Old Tax Regime FY 2025-26 */
function calcTDSOld(annualGross: number, annualEmployeePF: number): number {
  const section80C = Math.min(annualEmployeePF, 150000);
  const taxable = Math.max(0, annualGross - 50000 - section80C); // std ded + 80C
  if (taxable <= 250000) return 0;
  let tax = 0;
  if (taxable <= 500000) {
    tax = (taxable - 250000) * 0.05;
  } else if (taxable <= 1000000) {
    tax = 12500 + (taxable - 500000) * 0.20;
  } else {
    tax = 112500 + (taxable - 1000000) * 0.30;
  }
  if (taxable <= 500000) tax = 0; // 87A rebate
  return Math.round(tax * 1.04 * 100) / 100; // 4% cess
}

// GET: payroll status for all employees for a month
export async function GET(req: NextRequest) {
  const admin = await verifyUniversalAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const month = url.searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month parameter required (YYYY-MM)" }, { status: 400 });
  }

  const { data: employees } = await supabaseAdmin
    .from("hr_profiles")
    .select("id, full_name, designation, project_id, department")
    .is("deactivated_at", null)
    .order("full_name")
    .limit(500);

  const { data: salaryEntries } = await supabaseAdmin
    .from("hr_employee_salary")
    .select("employee_id")
    .is("effective_to", null);

  const employeesWithSalary = new Set((salaryEntries || []).map((s) => s.employee_id));

  const { data: payrollRecords } = await supabaseAdmin
    .from("hr_payroll")
    .select("employee_id, status, net_payable, gross_earnings, total_deductions, payment_date")
    .eq("month", month);

  const payrollMap = new Map((payrollRecords || []).map((p) => [p.employee_id, p]));

  const result = (employees || [])
    .filter((e) => employeesWithSalary.has(e.id))
    .map((e) => {
      const payroll = payrollMap.get(e.id);
      return {
        id: e.id,
        name: e.full_name,
        designation: e.designation,
        project: e.project_id,
        department: e.department,
        status: payroll?.status || "pending",
        net_payable: payroll?.net_payable || null,
        gross: payroll?.gross_earnings || null,
        deductions: payroll?.total_deductions || null,
        payment_date: payroll?.payment_date || null,
      };
    });

  return NextResponse.json({ employees: result, month });
}

// POST: run payroll for selected employees
export async function POST(req: NextRequest) {
  const admin = await verifyUniversalAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { month, employee_ids } = body as { month: string; employee_ids: string[] };
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month required (YYYY-MM)" }, { status: 400 });
  }
  if (!employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
    return NextResponse.json({ error: "employee_ids[] required" }, { status: 400 });
  }

  const [yearStr, monthStr] = month.split("-");
  const year = parseInt(yearStr);
  const monthNum = parseInt(monthStr);
  const workingDays = getWorkingDays(year, monthNum);
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  const { data: allComponents } = await supabaseAdmin
    .from("hr_salary_components")
    .select("id, name, type, is_statutory, calc_rule")
    .eq("is_active", true);

  const componentMap = new Map((allComponents || []).map((c) => [c.id, c]));
  const basicComponentId = (allComponents || []).find((c) => c.name === "Basic Salary")?.id;

  // Fetch employee profiles including payroll preferences
  const { data: profiles } = await supabaseAdmin
    .from("hr_profiles")
    .select("id, full_name, state, tds_regime, pf_opted_out")
    .in("id", employee_ids);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  const { data: salaryEntries } = await supabaseAdmin
    .from("hr_employee_salary")
    .select("employee_id, component_id, amount")
    .in("employee_id", employee_ids)
    .is("effective_to", null);

  const salaryByEmployee = new Map<string, { component_id: string; amount: number }[]>();
  for (const entry of salaryEntries || []) {
    const list = salaryByEmployee.get(entry.employee_id) || [];
    list.push({ component_id: entry.component_id, amount: Number(entry.amount) });
    salaryByEmployee.set(entry.employee_id, list);
  }

  // Bug A fix (forward-only — historical payroll runs already stored in hr_payroll are not
  // affected; this only changes how NEW payroll runs compute the day-status map).
  //
  // Ghost rows (synthetic rows from rectification/leave approval) must not override the
  // status derived from a real punch on the same day. We now:
  //   1. Fetch punch_out_at so classifyGhost() can detect rectification ghosts.
  //   2. Group rows per (employee, date) into real vs ghost buckets.
  //   3. If real punches exist for a day, use the real-punch-derived status only.
  //   4. If only ghost rows exist, use the ghost status (leave / WFH / rectification).
  // The downstream consumption of attMap (daysPresent / daysAbsent / lwpDays / leaveDays)
  // is unchanged — only the values stored in attMap are corrected.

  // Batch fetch attendance
  const startIso = `${month}-01T00:00:00+05:30`;
  const endIso = `${month}-${String(daysInMonth).padStart(2, "0")}T23:59:59+05:30`;
  type AttRec = { user_id: string; punch_in_at: string | null; punch_out_at: string | null; status: string; created_at: string };
  const allAttendance: AttRec[] = [];

  for (let i = 0; i < employee_ids.length; i += 50) {
    const batch = employee_ids.slice(i, i + 50);
    const { data } = await supabaseAdmin
      .from("hr_attendance")
      .select("user_id, punch_in_at, punch_out_at, status, created_at")
      .in("user_id", batch)
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .limit(5000);
    if (data) allAttendance.push(...data);
  }

  // Group rows per (employee, date) — separate real punches from ghost rows
  type DayBucket = { realStatus: string | null; ghostStatus: string | null };
  const attendanceByEmployee = new Map<string, Map<string, DayBucket>>();
  for (const rec of allAttendance) {
    const ts = rec.punch_in_at || rec.created_at;
    if (!ts) continue;
    const dateStr = new Date(ts).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const empMap = attendanceByEmployee.get(rec.user_id) || new Map<string, DayBucket>();
    const bucket = empMap.get(dateStr) || { realStatus: null, ghostStatus: null };

    if (classifyGhost(rec) !== null) {
      // Ghost row — only record status if no ghost seen yet for this day
      if (!bucket.ghostStatus) bucket.ghostStatus = rec.status;
      else if (rec.status === "on-leave" || rec.status === "lwp") bucket.ghostStatus = rec.status;
    } else {
      // Real punch row — apply same precedence rules as before
      if (!bucket.realStatus) {
        bucket.realStatus = rec.status;
      } else if (rec.status === "on-leave" || rec.status === "lwp") {
        bucket.realStatus = rec.status;
      }
    }

    empMap.set(dateStr, bucket);
    attendanceByEmployee.set(rec.user_id, empMap);
  }

  // Build the final attMap: real punch status wins; fall back to ghost if no real punch
  const resolvedAttendance = new Map<string, Map<string, string>>();
  Array.from(attendanceByEmployee.entries()).forEach(([empId, dayMap]) => {
    const resolved = new Map<string, string>();
    Array.from(dayMap.entries()).forEach(([dateStr, bucket]) => {
      resolved.set(dateStr, bucket.realStatus ?? bucket.ghostStatus ?? "present");
    });
    resolvedAttendance.set(empId, resolved);
  });

  const results: { employee_id: string; name: string; net_payable: number; status: string }[] = [];
  const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  for (const empId of employee_ids) {
    const salary = salaryByEmployee.get(empId);
    if (!salary || salary.length === 0) continue;

    const profile = profileMap.get(empId);
    const attMap = resolvedAttendance.get(empId) || new Map();

    // Count attendance
    let daysPresent = 0, daysAbsent = 0, lwpDays = 0, leaveDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(year, monthNum - 1, d).getDay() === 0) continue;
      const dateStr = `${month}-${String(d).padStart(2, "0")}`;
      if (dateStr > todayIST) continue;
      const status = attMap.get(dateStr);
      if (!status) { daysAbsent++; lwpDays++; }
      else if (status === "present" || status === "late") { daysPresent++; }
      else if (status === "half-day") { daysPresent++; lwpDays += 0.5; }
      else if (status === "on-leave") { leaveDays++; }
      else if (status === "lwp" || status === "absent") { lwpDays++; daysAbsent++; }
    }

    // Earnings
    const earningsBreakdown: Record<string, number> = {};
    let grossEarnings = 0, basicAmount = 0;
    for (const entry of salary) {
      const comp = componentMap.get(entry.component_id);
      if (!comp || comp.type !== "earning") continue;
      earningsBreakdown[comp.name] = entry.amount;
      grossEarnings += entry.amount;
      if (entry.component_id === basicComponentId) basicAmount = entry.amount;
    }

    const lwpDeduction = Math.round((grossEarnings / 30) * lwpDays * 100) / 100;
    const adjustedGross = grossEarnings - lwpDeduction;

    // Employee statutory deductions
    const deductionsBreakdown: Record<string, number> = {};

    // PF: 12% of basic (capped ₹15k base), skip if opted out
    let employeePF = 0;
    if (!profile?.pf_opted_out) {
      const pfBase = Math.min(basicAmount, 15000);
      employeePF = Math.round(pfBase * 0.12 * 100) / 100;
      if (employeePF > 0) deductionsBreakdown["PF (Employee)"] = employeePF;
    }

    // ESI: 0.75% of adjusted gross (only if ≤ ₹21,000)
    let employeeESI = 0;
    if (adjustedGross <= 21000) {
      employeeESI = Math.round(adjustedGross * 0.0075 * 100) / 100;
      if (employeeESI > 0) deductionsBreakdown["ESI (Employee)"] = employeeESI;
    }

    // Professional Tax
    const pt = getProfessionalTax(profile?.state ?? null, adjustedGross);
    if (pt > 0) deductionsBreakdown["Professional Tax"] = pt;

    // LWP
    if (lwpDeduction > 0) deductionsBreakdown["LWP Deduction"] = lwpDeduction;

    // Fixed non-statutory deductions from salary setup
    for (const entry of salary) {
      const comp = componentMap.get(entry.component_id);
      if (!comp || comp.type !== "deduction" || comp.is_statutory) continue;
      if (entry.amount > 0) deductionsBreakdown[comp.name] = entry.amount;
    }

    // TDS
    const tdsRegime = profile?.tds_regime || "new";
    const annualGross = grossEarnings * 12;
    const annualPF = employeePF * 12;
    const annualTax = tdsRegime === "old"
      ? calcTDSOld(annualGross, annualPF)
      : calcTDSNew(annualGross);
    const monthlyTDS = Math.round((annualTax / 12) * 100) / 100;
    if (monthlyTDS > 0) deductionsBreakdown["TDS"] = monthlyTDS;

    const totalDeductions = Object.values(deductionsBreakdown).reduce((a, b) => a + b, 0);
    const netFinal = Math.round((grossEarnings - totalDeductions) * 100) / 100;

    // Employer contributions (informational, not deducted from employee)
    let employerPF = 0, employerESI = 0;
    if (!profile?.pf_opted_out) {
      const pfBase = Math.min(basicAmount, 15000);
      employerPF = Math.round(pfBase * 0.12 * 100) / 100;
    }
    if (adjustedGross <= 21000) {
      employerESI = Math.round(adjustedGross * 0.0325 * 100) / 100;
    }

    const { error } = await supabaseAdmin
      .from("hr_payroll")
      .upsert(
        {
          employee_id: empId,
          month,
          gross_earnings: grossEarnings,
          total_deductions: totalDeductions,
          net_payable: netFinal,
          working_days: workingDays,
          days_present: daysPresent,
          days_absent: daysAbsent,
          lwp_days: lwpDays,
          leave_days: leaveDays,
          earnings_breakdown: earningsBreakdown,
          deductions_breakdown: deductionsBreakdown,
          tds_amount: monthlyTDS,
          tds_regime: tdsRegime,
          employer_pf: employerPF,
          employer_esi: employerESI,
          status: "processed",
          processed_by: admin.id,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "employee_id,month" }
      );

    if (!error) {
      results.push({ employee_id: empId, name: profile?.full_name || "Unknown", net_payable: netFinal, status: "processed" });
    }
  }

  return NextResponse.json({ success: true, processed: results.length, total: employee_ids.length, results });
}
