// src/app/api/admin/bulk-upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

interface SalaryInput {
  basic_salary?: number;
  hra?: number;
  da?: number;
  conveyance_allowance?: number;
  special_allowance?: number;
  medical_allowance?: number;
}

interface EmployeeInput {
  full_name: string;
  phone: string;
  project: string;
  department: string;
  designation: string;
  role?: string;
  employee_code?: string;
  personal_email?: string;
  date_of_joining?: string;
  reporting_manager_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  // KYC
  aadhaar?: string;
  pan?: string;
  bank_name?: string;
  account_no?: string;
  ifsc?: string;
  // Payroll prefs
  tds_regime?: string;
  pf_opted_out?: boolean;
  uan_number?: string;
  salary?: SalaryInput;
}

interface UploadResult {
  phone: string;
  name: string;
  success: boolean;
  error?: string;
}

const SALARY_COMPONENT_NAMES = [
  "Basic Salary",
  "HRA",
  "DA",
  "Conveyance Allowance",
  "Special Allowance",
  "Medical Allowance",
];

async function verifyUniversalAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await supabaseAdmin
    .from("hr_profiles")
    .select("role, designation, project_id")
    .eq("id", user.id)
    .is("deactivated_at", null)
    .single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) return null;
  const isUniversal =
    profile.role === "super_admin" ||
    (profile.designation?.toLowerCase().includes("hr") ?? false);
  if (!isUniversal) return null;
  return { id: user.id };
}

async function getSalaryComponentMap(): Promise<Map<string, string>> {
  const { data } = await supabaseAdmin
    .from("hr_salary_components")
    .select("id, name")
    .in("name", SALARY_COMPONENT_NAMES)
    .eq("is_active", true);
  const map = new Map<string, string>();
  for (const c of data ?? []) map.set(c.name, c.id);
  return map;
}

export async function POST(req: NextRequest) {
  const admin = await verifyUniversalAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden — HR or super_admin only" }, { status: 403 });

  let body: { employees: EmployeeInput[] };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { employees } = body;
  if (!Array.isArray(employees) || employees.length === 0) {
    return NextResponse.json({ error: "employees array is required" }, { status: 400 });
  }
  if (employees.length > 500) {
    return NextResponse.json({ error: "Maximum 500 employees per batch" }, { status: 400 });
  }

  const salaryComponentMap = await getSalaryComponentMap();
  const results: UploadResult[] = [];

  for (const emp of employees) {
    const phone = (emp.phone ?? "").replace(/\D/g, "").slice(-10);
    const name = emp.full_name?.trim() ?? "";

    try {
      // Resolve reporting manager by phone
      let reportingManagerId: string | null = null;
      if (emp.reporting_manager_phone) {
        const mgrPhone = emp.reporting_manager_phone.replace(/\D/g, "").slice(-10);
        const { data: mgr } = await supabaseAdmin
          .from("hr_profiles")
          .select("id")
          .eq("phone", mgrPhone)
          .is("deactivated_at", null)
          .single();
        reportingManagerId = mgr?.id ?? null;
      }

      // Create auth user
      const authEmail = `${phone}@uds.hr`;
      const namePart = name.replace(/\s+/g, "").slice(0, 4).toLowerCase();
      const phonePart = phone.slice(-4);
      const password = namePart + phonePart;

      if (password.length < 6) throw new Error("Name or phone too short for default password");

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
      });
      if (authError) throw new Error(authError.message);

      const userId = authData.user.id;

      // Build KYC JSONB
      const hasKyc = emp.aadhaar || emp.pan || emp.bank_name || emp.account_no || emp.ifsc;
      const kycData = hasKyc
        ? {
            aadhaar: emp.aadhaar || null,
            pan: emp.pan || null,
            bank_name: emp.bank_name || null,
            account_no: emp.account_no || null,
            ifsc: emp.ifsc || null,
          }
        : null;

      // Insert hr_profiles
      const profileInsert: Record<string, unknown> = {
        id: userId,
        full_name: name,
        phone,
        email: emp.personal_email || null,
        designation: emp.designation || null,
        department: emp.department,
        project_id: emp.project,
        role: ["employee", "manager"].includes(emp.role ?? "") ? emp.role : "employee",
        reporting_manager_id: reportingManagerId,
        employee_code: emp.employee_code || null,
        date_of_joining: emp.date_of_joining || null,
        address: emp.address || null,
        city: emp.city || null,
        state: emp.state || null,
        pincode: emp.pincode || null,
        kyc_data: kycData,
        tds_regime: emp.tds_regime === "old" ? "old" : "new",
        pf_opted_out: emp.pf_opted_out ?? false,
        uan_number: emp.uan_number || null,
      };

      const { error: profileError } = await supabaseAdmin
        .from("hr_profiles")
        .insert(profileInsert);

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(profileError.message);
      }

      // Create leave balance
      await supabaseAdmin.from("hr_leave_balances").insert({
        user_id: userId,
        year: new Date().getFullYear(),
      });

      // Insert salary components if provided
      if (emp.salary) {
        const componentFieldMap: Record<string, string> = {
          basic_salary: "Basic Salary",
          hra: "HRA",
          da: "DA",
          conveyance_allowance: "Conveyance Allowance",
          special_allowance: "Special Allowance",
          medical_allowance: "Medical Allowance",
        };
        const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        const salaryEntries = [];
        for (const [field, componentName] of Object.entries(componentFieldMap)) {
          const amount = (emp.salary as Record<string, unknown>)[field];
          if (amount && Number(amount) > 0) {
            const componentId = salaryComponentMap.get(componentName);
            if (componentId) {
              salaryEntries.push({ employee_id: userId, component_id: componentId, amount: Number(amount), effective_from: today });
            }
          }
        }
        if (salaryEntries.length > 0) {
          await supabaseAdmin.from("hr_employee_salary").insert(salaryEntries);
        }
      }

      results.push({ phone, name, success: true });
    } catch (err) {
      results.push({ phone, name, success: false, error: (err as Error).message });
    }
  }

  return NextResponse.json({ results });
}
