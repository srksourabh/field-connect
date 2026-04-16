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
  // Default for other states
  return grossSalary > 10000 ? 200 : 0;
}

/** Count working days (Mon-Sat, exclude Sundays) in a month */
function getWorkingDays(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let working = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    if (dayOfWeek !== 0) working++; // Exclude Sundays
  }
  return working;
}

// GET: list payroll status for all employees for a given month
export async function GET(req: NextRequest) {
  const admin = await verifyUniversalAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const month = url.searchParams.get("month"); // "2026-04"
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month parameter required (YYYY-MM)" }, { status: 400 });
  }

  // Get all active employees with salary configured
  const { data: employees } = await supabaseAdmin
    .from("hr_profiles")
    .select("id, full_name, designation, project_id, department")
    .is("deactivated_at", null)
    .order("full_name")
    .limit(500);

  // Get employees who have salary setup
  const { data: salaryEntries } = await supabaseAdmin
    .from("hr_employee_salary")
    .select("employee_id")
    .is("effective_to", null);

  const employeesWithSalary = new Set((salaryEntries || []).map((s) => s.employee_id));

  // Get existing payroll records for this month
  const { data: payrollRecords } = await supabaseAdmin
    .from("hr_payroll")
    .select("employee_id, status, net_payable, gross_earnings, total_deductions")
    .eq("month", month);

  const payrollMap = new Map(
    (payrollRecords || []).map((p) => [p.employee_id, p])
  );

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
      };
    });

  return NextResponse.json({ employees: result, month });
}

// POST: run payroll for selected employees for a given month
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

  // Fetch all active salary components
  const { data: allComponents } = await supabaseAdmin
    .from("hr_salary_components")
    .select("id, name, type, is_statutory, calc_rule")
    .eq("is_active", true);

  const componentMap = new Map((allComponents || []).map((c) => [c.id, c]));
  const basicComponentId = (allComponents || []).find((c) => c.name === "Basic Salary")?.id;

  // Fetch employee profiles (for state → PT)
  const { data: profiles } = await supabaseAdmin
    .from("hr_profiles")
    .select("id, full_name, state")
    .in("id", employee_ids);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  // Fetch salary entries for selected employees
  const { data: salaryEntries } = await supabaseAdmin
    .from("hr_employee_salary")
    .select("employee_id, component_id, amount")
    .in("employee_id", employee_ids)
    .is("effective_to", null);

  // Group salary by employee
  const salaryByEmployee = new Map<string, { component_id: string; amount: number }[]>();
  for (const entry of salaryEntries || []) {
    const list = salaryByEmployee.get(entry.employee_id) || [];
    list.push({ component_id: entry.component_id, amount: Number(entry.amount) });
    salaryByEmployee.set(entry.employee_id, list);
  }

  // Fetch attendance for the month
  const startIso = `${month}-01T00:00:00+05:30`;
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const endIso = `${month}-${String(daysInMonth).padStart(2, "0")}T23:59:59+05:30`;

  // Batch fetch attendance
  const batchSize = 50;
  type AttRec = { user_id: string; punch_in_at: string | null; punch_out_at: string | null; status: string; created_at: string };
  const allAttendance: AttRec[] = [];

  for (let i = 0; i < employee_ids.length; i += batchSize) {
    const batch = employee_ids.slice(i, i + batchSize);
    const { data } = await supabaseAdmin
      .from("hr_attendance")
      .select("user_id, punch_in_at, punch_out_at, status, created_at")
      .in("user_id", batch)
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .limit(5000);
    if (data) allAttendance.push(...data);
  }

  // Group attendance by employee → unique dates
  const attendanceByEmployee = new Map<string, Map<string, string>>();
  for (const rec of allAttendance) {
    const ts = rec.punch_in_at || rec.created_at;
    if (!ts) continue;
    const dateStr = new Date(ts).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const empMap = attendanceByEmployee.get(rec.user_id) || new Map<string, string>();
    // Keep worst status per date
    if (!empMap.has(dateStr)) {
      empMap.set(dateStr, rec.status);
    } else if (rec.status === "on-leave" || rec.status === "lwp") {
      empMap.set(dateStr, rec.status);
    }
    attendanceByEmployee.set(rec.user_id, empMap);
  }

  // Process each employee
  const results: { employee_id: string; name: string; net_payable: number; status: string }[] = [];

  for (const empId of employee_ids) {
    const salary = salaryByEmployee.get(empId);
    if (!salary || salary.length === 0) continue;

    const profile = profileMap.get(empId);
    const attMap = attendanceByEmployee.get(empId) || new Map();

    // Count attendance
    let daysPresent = 0;
    let daysAbsent = 0;
    let lwpDays = 0;
    let leaveDays = 0;

    // Check each working day of the month
    const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfWeek = new Date(year, monthNum - 1, d).getDay();
      if (dayOfWeek === 0) continue; // Skip Sunday

      const dateStr = `${month}-${String(d).padStart(2, "0")}`;
      // Skip future dates
      if (dateStr > todayIST) continue;

      const status = attMap.get(dateStr);
      if (!status) {
        daysAbsent++;
        lwpDays++;
      } else if (status === "present" || status === "late") {
        daysPresent++;
      } else if (status === "half-day") {
        daysPresent++;
        lwpDays += 0.5;
      } else if (status === "on-leave") {
        leaveDays++;
      } else if (status === "lwp") {
        lwpDays++;
        daysAbsent++;
      } else if (status === "absent") {
        daysAbsent++;
        lwpDays++;
      }
    }

    // Calculate earnings
    const earningsBreakdown: Record<string, number> = {};
    let grossEarnings = 0;
    let basicAmount = 0;

    for (const entry of salary) {
      const comp = componentMap.get(entry.component_id);
      if (!comp || comp.type !== "earning") continue;
      earningsBreakdown[comp.name] = entry.amount;
      grossEarnings += entry.amount;
      if (entry.component_id === basicComponentId) {
        basicAmount = entry.amount;
      }
    }

    // LWP deduction (calendar day method: monthly / 30 × LWP days)
    const perDaySalary = grossEarnings / 30;
    const lwpDeduction = Math.round(perDaySalary * lwpDays * 100) / 100;

    const adjustedGross = grossEarnings - lwpDeduction;

    // Statutory deductions
    const deductionsBreakdown: Record<string, number> = {};

    // PF: 12% of Basic (capped at ₹1800 for basic ≤ ₹15000)
    const pfBase = Math.min(basicAmount, 15000);
    const pf = Math.round(pfBase * 0.12 * 100) / 100;
    if (pf > 0) deductionsBreakdown["PF"] = pf;

    // ESI: 0.75% of gross (only if gross ≤ ₹21000)
    if (adjustedGross <= 21000) {
      const esi = Math.round(adjustedGross * 0.0075 * 100) / 100;
      if (esi > 0) deductionsBreakdown["ESI"] = esi;
    }

    // Professional Tax
    const pt = getProfessionalTax(profile?.state ?? null, adjustedGross);
    if (pt > 0) deductionsBreakdown["Professional Tax"] = pt;

    // LWP deduction entry
    if (lwpDeduction > 0) deductionsBreakdown["LWP Deduction"] = lwpDeduction;

    // Add any fixed deduction overrides from salary setup
    for (const entry of salary) {
      const comp = componentMap.get(entry.component_id);
      if (!comp || comp.type !== "deduction") continue;
      // Skip statutory ones we already calculated
      if (comp.is_statutory) continue;
      if (entry.amount > 0) {
        deductionsBreakdown[comp.name] = entry.amount;
      }
    }

    const totalDeductions = Object.values(deductionsBreakdown).reduce((a, b) => a + b, 0);
    // Net = Gross Earnings - All Deductions (LWP is already in deductionsBreakdown)
    const netFinal = Math.round((grossEarnings - totalDeductions) * 100) / 100;

    // Upsert payroll record
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
          status: "processed",
          processed_by: admin.id,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "employee_id,month" }
      );

    if (!error) {
      results.push({
        employee_id: empId,
        name: profile?.full_name || "Unknown",
        net_payable: netFinal,
        status: "processed",
      });
    }
  }

  return NextResponse.json({
    success: true,
    processed: results.length,
    total: employee_ids.length,
    results,
  });
}
