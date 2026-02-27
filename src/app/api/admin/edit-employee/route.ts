import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(req: NextRequest) {
  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { userId, ...updates } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Verify caller
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.split(" ")[1];
  const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: callerProfile } = await supabaseAdmin
    .from("hr_profiles")
    .select("role, project_id, designation")
    .eq("id", caller.id)
    .is("deactivated_at", null)
    .single();

  if (!callerProfile || !["admin", "super_admin"].includes(callerProfile.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const isUniversal = callerProfile.role === "super_admin" ||
    (callerProfile.designation?.toLowerCase().includes("hr") ?? false);

  // If regular admin, verify target is in their project
  if (!isUniversal) {
    const { data: targetProfile } = await supabaseAdmin
      .from("hr_profiles")
      .select("project_id")
      .eq("id", userId)
      .single();

    if (!targetProfile || targetProfile.project_id !== callerProfile.project_id) {
      return NextResponse.json({ error: "You can only edit employees in your project" }, { status: 403 });
    }
  }

  // Only super_admin can set admin or super_admin role
  if (updates.role === "super_admin" && callerProfile.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admins can assign super_admin role" }, { status: 403 });
  }
  if (updates.role === "admin" && callerProfile.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admins can assign admin role" }, { status: 403 });
  }

  // Filter allowed fields
  const allowedFields = [
    "full_name", "phone", "designation", "department", "project_id", "role",
    "email", "reporting_manager_id", "date_of_joining", "employee_code",
    "address", "city", "state", "pincode", "leave_policy_id",
  ];

  const filtered: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in updates) {
      filtered[key] = updates[key];
    }
  }

  if (Object.keys(filtered).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // If phone is being changed, sync the Supabase auth email to match new phone@uds.hr
  if (filtered.phone) {
    const cleanPhone = String(filtered.phone).replace(/\D/g, "").slice(-10);
    const authEmail = `${cleanPhone}@uds.hr`;
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: authEmail,
    });
    if (authError) {
      return NextResponse.json({ error: `Failed to update auth email: ${authError.message}` }, { status: 500 });
    }
  }

  const { error } = await supabaseAdmin
    .from("hr_profiles")
    .update(filtered)
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If leave_policy_id is set, update leave balances for current year
  if (filtered.leave_policy_id) {
    const { data: policy } = await supabaseAdmin
      .from("hr_leave_policies")
      .select("sick_leave_count, casual_leave_count, privilege_leave_count")
      .eq("id", filtered.leave_policy_id)
      .single();

    if (policy) {
      const year = new Date().getFullYear();
      const balanceUpdate = {
        sick_leave_total: policy.sick_leave_count,
        casual_leave_total: policy.casual_leave_count,
        privilege_leave_total: policy.privilege_leave_count,
      };

      // Upsert: update if exists, insert if not
      const { data: existing } = await supabaseAdmin
        .from("hr_leave_balances")
        .select("id")
        .eq("user_id", userId)
        .eq("year", year)
        .single();

      if (existing) {
        await supabaseAdmin
          .from("hr_leave_balances")
          .update(balanceUpdate)
          .eq("id", existing.id);
      } else {
        await supabaseAdmin
          .from("hr_leave_balances")
          .insert({
            user_id: userId,
            year,
            ...balanceUpdate,
            sick_leave_used: 0,
            casual_leave_used: 0,
            privilege_leave_used: 0,
            compoff_total: 0,
            compoff_used: 0,
          });
      }
    }
  }

  return NextResponse.json({ success: true });
}
