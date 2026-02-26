import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { token, personal, job } = body;

  if (!token || !personal?.fullName || !personal?.email || !personal?.phone) {
    return NextResponse.json(
      { error: "Missing required fields: name, email, phone, and token" },
      { status: 400 }
    );
  }

  // 1. Atomically claim the token (prevents race condition with concurrent submissions)
  const { data: tokenRow, error: claimError } = await supabaseAdmin
    .from("hr_onboarding_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token)
    .is("used_at", null)
    .select()
    .single();

  if (claimError || !tokenRow) {
    // Either invalid token or already used (concurrent submission lost the race)
    return NextResponse.json({ error: "This onboarding link is invalid or has already been used." }, { status: 400 });
  }

  // Compare in IST to avoid UTC vs IST date boundary issues
  const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const expiryIST = new Date(new Date(tokenRow.expires_at).toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  if (expiryIST < nowIST) {
    // Token expired — unclaim it so admin can see it as expired (not used)
    await supabaseAdmin
      .from("hr_onboarding_tokens")
      .update({ used_at: null })
      .eq("id", tokenRow.id);
    return NextResponse.json({ error: "This onboarding link has expired." }, { status: 400 });
  }

  // 2. Generate default password: first 4 letters of name (lowercase) + last 4 digits of phone
  const namePart = personal.fullName.replace(/\s+/g, "").slice(0, 4).toLowerCase();
  const phonePart = (personal.phone || "0000").replace(/\D/g, "").slice(-4);
  const defaultPassword = namePart + phonePart;

  if (defaultPassword.length < 6) {
    return NextResponse.json(
      { error: "Name or phone too short to generate a valid password." },
      { status: 400 }
    );
  }

  // 3. Create Supabase auth user (auth email must be phone@uds.hr to match login flow)
  const cleanPhone = (personal.phone || "").replace(/\D/g, "").slice(-10);
  const authEmail = `${cleanPhone}@uds.hr`;
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: authEmail,
    password: defaultPassword,
    email_confirm: true,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const userId = authData.user.id;

  // 4. Create hr_profiles entry
  const { error: profileError } = await supabaseAdmin.from("hr_profiles").insert({
    id: userId,
    full_name: personal.fullName,
    email: personal.email,
    phone: personal.phone,
    address: personal.address || null,
    designation: job?.designation || null,
    department: job?.department || null,
    date_of_joining: job?.joiningDate || null,
    role: "employee", // Always employee — role changes require admin action
  });

  if (profileError) {
    // Clean up orphaned auth user
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // 5. Create leave balance for current year
  const currentYear = new Date().getFullYear();
  await supabaseAdmin.from("hr_leave_balances").insert({
    user_id: userId,
    year: currentYear,
  });

  // Token was already marked as used in the atomic claim at step 1

  return NextResponse.json({
    success: true,
    message: `Account created for ${personal.fullName}. Default password: first 4 letters of name + last 4 digits of phone.`,
  });
}
