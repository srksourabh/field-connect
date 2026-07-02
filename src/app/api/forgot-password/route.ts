import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Forgot password: look up phone → reset to default password
export async function POST(req: NextRequest) {
  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { phone, step } = body;
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

  // Step 1: Return masked name for confirmation
  if (step === "lookup") {
    const maskedName = maskName(profile.full_name);
    return NextResponse.json({ masked_name: maskedName });
  }

  // Step 2: Confirm and reset password
  if (step === "reset") {
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
    const authEmail = `${cleanPhone}@fieldconnect.local`;
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

/** Mask name: "Sourabh Bhaumik" → "So***bh Bh***ik" */
function maskName(name: string): string {
  return name.split(" ").map((part) => {
    if (part.length <= 2) return part[0] + "***";
    return part[0] + part[1] + "***" + part.slice(-2);
  }).join(" ");
}
