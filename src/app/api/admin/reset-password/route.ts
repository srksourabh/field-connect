import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    const body = await req.json();
    userId = body.userId;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!userId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Verify the caller is an admin
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.split(" ")[1];
  const { data: { user: callerUser } } = await supabaseAdmin.auth.getUser(token);

  if (!callerUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: callerProfile } = await supabaseAdmin
    .from("hr_profiles")
    .select("role, project_id, designation")
    .eq("id", callerUser.id)
    .is("deactivated_at", null)
    .single();

  if (!callerProfile || !["admin", "super_admin"].includes(callerProfile.role)) {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
  }

  // Project scoping: regular admins can only reset passwords in their project
  const isUniversal = callerProfile.role === "super_admin" ||
    (callerProfile.designation?.toLowerCase().includes("hr") ?? false);

  // Fetch target user's profile for password generation
  const { data: targetProfile } = await supabaseAdmin
    .from("hr_profiles")
    .select("full_name, phone, project_id, role")
    .eq("id", userId)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!isUniversal && targetProfile.project_id !== callerProfile.project_id) {
    return NextResponse.json({ error: "You can only manage employees in your project" }, { status: 403 });
  }

  // Prevent non-super_admin from resetting super_admin passwords
  if (targetProfile.role === "super_admin" && callerProfile.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admins can reset other super admin passwords" }, { status: 403 });
  }

  // Generate default password: first 4 letters of name (lowercase) + last 4 digits of phone
  const namePart = targetProfile.full_name
    .replace(/\s+/g, "")
    .slice(0, 4)
    .toLowerCase();
  const phonePart = (targetProfile.phone || "0000").replace(/\D/g, "").slice(-4);
  const newPassword = namePart + phonePart;

  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "Cannot generate valid password — name or phone too short" },
      { status: 400 }
    );
  }

  // Ensure auth email matches phone@uds.hr (fixes legacy accounts with wrong email)
  const cleanPhone = (targetProfile.phone || "").replace(/\D/g, "").slice(-10);
  const authEmail = `${cleanPhone}@uds.hr`;

  // Reset password and fix auth email via Supabase Admin API
  // email_confirm: true ensures the email is immediately confirmed (no confirmation link)
  // Without this, password update may be deferred until email is confirmed
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email: authEmail,
    password: newPassword,
    email_confirm: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Invalidate all existing sessions so the user must log in with the new password
  try { await supabaseAdmin.auth.admin.signOut(userId, "global"); } catch { /* best-effort */ }

  return NextResponse.json({ success: true });
}
