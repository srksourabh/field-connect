import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const DEMO_PHONE = "9999999999";
const DEMO_PASSWORD = "demo9999";
const DEMO_EMAIL = `${DEMO_PHONE}@fieldconnect.local`;

async function findAuthUserByEmail(email: string) {
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );
    if (match) return match;
    if (data.users.length < perPage) return null;
    page++;
  }
}

export async function POST() {
  try {
    const existingUser = await findAuthUserByEmail(DEMO_EMAIL);

    let userId = existingUser?.id;
    if (userId) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
      });
      if (error) throw error;
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
      });
      if (error) throw error;
      userId = data.user.id;
    }

    await supabaseAdmin.from("hr_master_data").upsert(
      [
        { type: "project", name: "Demo Company", is_active: true },
        { type: "department", name: "HR", is_active: true },
        { type: "designation", name: "Demo Admin", is_active: true },
      ],
      { onConflict: "type,name" }
    );

    const { error: profileError } = await supabaseAdmin.from("hr_profiles").upsert({
      id: userId,
      full_name: "Demo Admin",
      designation: "HR Admin",
      project_id: "Demo Company",
      department: "HR",
      role: "admin",
      phone: DEMO_PHONE,
      email: "demo.admin@fieldconnect.local",
      employee_code: "DEMO-ADMIN",
      date_of_joining: new Date().toISOString().slice(0, 10),
      deactivated_at: null,
    });
    if (profileError) throw profileError;

    const year = new Date().getFullYear();
    const { data: existingBalance, error: balanceLookupError } = await supabaseAdmin
      .from("hr_leave_balances")
      .select("id")
      .eq("user_id", userId)
      .eq("year", year)
      .maybeSingle();
    if (balanceLookupError) throw balanceLookupError;

    if (!existingBalance) {
      const { error: balanceError } = await supabaseAdmin.from("hr_leave_balances").insert({
        user_id: userId,
        year,
        sick_leave_total: 10,
        casual_leave_total: 5,
        privilege_leave_total: 0,
        wfh_total: 10,
      });
      if (balanceError) throw balanceError;
    }

    return NextResponse.json({
      phone: DEMO_PHONE,
      password: DEMO_PASSWORD,
    });
  } catch (error) {
    console.error("Demo login setup failed", error);
    return NextResponse.json(
      { error: "Unable to prepare demo account." },
      { status: 500 }
    );
  }
}
