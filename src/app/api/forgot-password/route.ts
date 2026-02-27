import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Step 1: Look up phone → check if email is registered, return masked hint
export async function POST(req: NextRequest) {
  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { phone, email, step } = body;
  const cleanPhone = (phone || "").replace(/\D/g, "");

  if (cleanPhone.length !== 10) {
    return NextResponse.json({ error: "Enter a valid 10-digit mobile number" }, { status: 400 });
  }

  // Look up profile
  const { data: profile } = await supabaseAdmin
    .from("hr_profiles")
    .select("id, email, full_name, phone")
    .eq("phone", cleanPhone)
    .is("deactivated_at", null)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "No account found with this mobile number" }, { status: 404 });
  }

  const rawEmail = profile.email?.trim();
  // Skip @uds.hr auth emails — they aren't personal/company emails
  const realEmail = rawEmail && !rawEmail.endsWith("@uds.hr") ? rawEmail : null;
  if (!realEmail) {
    return NextResponse.json(
      { error: "No personal email registered for this account. Please contact your manager or HR to reset your password." },
      { status: 400 }
    );
  }

  // Step 1: Return masked email for verification prompt
  if (step === "lookup") {
    const masked = maskEmail(realEmail);
    return NextResponse.json({ masked_email: masked });
  }

  // Step 2: Verify email and reset password
  if (step === "verify") {
    if (!email || email.trim().toLowerCase() !== realEmail.toLowerCase()) {
      return NextResponse.json({ error: "Email does not match our records" }, { status: 400 });
    }

    // Generate default password: first 4 letters of name (lowercase, no spaces) + last 4 digits of phone
    const namePart = profile.full_name
      .replace(/\s+/g, "")
      .slice(0, 4)
      .toLowerCase();
    const phonePart = cleanPhone.slice(-4);
    const newPassword = namePart + phonePart;

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Cannot generate valid password. Please contact your manager or HR." },
        { status: 400 }
      );
    }

    // Reset password via admin API
    const authEmail = `${cleanPhone}@uds.hr`;
    const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      email: authEmail,
      password: newPassword,
      email_confirm: true,
    });

    if (error) {
      return NextResponse.json({ error: "Unable to reset password. Please try again." }, { status: 500 });
    }

    // Invalidate all existing sessions
    try { await supabaseAdmin.auth.admin.signOut(profile.id, "global"); } catch { /* best-effort */ }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid step" }, { status: 400 });
}

/** Mask email: "sourabh@gmail.com" → "so***bh@gm***om" */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const maskPart = (s: string) => {
    if (s.length <= 2) return s[0] + "***";
    return s[0] + s[1] + "***" + s.slice(-2);
  };
  const domainParts = domain.split(".");
  const domainName = domainParts[0];
  const domainExt = domainParts.slice(1).join(".");
  return `${maskPart(local)}@${maskPart(domainName)}.${domainExt}`;
}
