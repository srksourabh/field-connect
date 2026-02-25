import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Validate token
  const { data: tokenRow } = await supabaseAdmin
    .from("hr_onboarding_tokens")
    .select("*")
    .eq("token", token)
    .single();

  if (!tokenRow) {
    return NextResponse.json({ error: "Invalid onboarding link." }, { status: 404 });
  }

  if (tokenRow.used_at) {
    return NextResponse.json({ error: "This onboarding link has already been used." }, { status: 400 });
  }

  // Compare in IST to avoid UTC vs IST date boundary issues
  const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const expiryIST = new Date(new Date(tokenRow.expires_at).toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  if (expiryIST < nowIST) {
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

  // 6. Mark token as used
  await supabaseAdmin
    .from("hr_onboarding_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  return NextResponse.json({
    success: true,
    message: `Account created for ${personal.fullName}. Default password: first 4 letters of name + last 4 digits of phone.`,
  });
}
