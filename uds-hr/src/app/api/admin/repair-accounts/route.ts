import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/admin/repair-accounts
 *
 * Bulk-repairs all legacy employee accounts whose Supabase auth email
 * does not match the expected {phone}@uds.hr format.
 *
 * For each mismatched account:
 *   1. Updates auth email to {phone}@uds.hr
 *   2. Resets password to the default (first 4 of name + last 4 of phone)
 *
 * Requires super_admin Bearer token.
 */
export async function POST(req: NextRequest) {
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // Verify caller is super_admin
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
    .select("role")
    .eq("id", caller.id)
    .is("deactivated_at", null)
    .single();
  if (!callerProfile || callerProfile.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin access required." }, { status: 403 });
  }

  // Get all active profiles
  const { data: profiles, error: fetchError } = await supabaseAdmin
    .from("hr_profiles")
    .select("id, full_name, phone, email")
    .is("deactivated_at", null);

  if (fetchError || !profiles) {
    return NextResponse.json({ error: fetchError?.message || "Failed to fetch profiles" }, { status: 500 });
  }

  const results: { name: string; phone: string; status: string; oldEmail?: string; newEmail?: string; defaultPassword?: string }[] = [];

  for (const profile of profiles) {
    const rawPhone = profile.phone || "";
    const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);

    if (cleanPhone.length !== 10) {
      results.push({ name: profile.full_name, phone: rawPhone, status: "skipped — invalid phone" });
      continue;
    }

    const expectedEmail = `${cleanPhone}@uds.hr`;

    // Get current auth user
    const { data: { user: authUser }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    if (getUserError || !authUser) {
      results.push({ name: profile.full_name, phone: rawPhone, status: "skipped — no auth user found" });
      continue;
    }

    // Generate default password: first 4 letters of name (lowercase) + last 4 digits of phone
    const namePart = profile.full_name.replace(/\s+/g, "").slice(0, 4).toLowerCase();
    const phonePart = (rawPhone || "0000").replace(/\D/g, "").slice(-4);
    const defaultPassword = namePart + phonePart;

    if (defaultPassword.length < 6) {
      results.push({ name: profile.full_name, phone: rawPhone, status: "skipped — password too short" });
      continue;
    }

    const emailChanged = authUser.email !== expectedEmail;

    // Always set auth email + password to ensure every account is in the correct state
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      email: expectedEmail,
      password: defaultPassword,
    });

    if (updateError) {
      results.push({ name: profile.full_name, phone: rawPhone, status: `failed — ${updateError.message}` });
    } else {
      results.push({
        name: profile.full_name,
        phone: rawPhone,
        status: emailChanged ? "fixed — email + password reset" : "fixed — password reset",
        oldEmail: emailChanged ? authUser.email : undefined,
        newEmail: expectedEmail,
        defaultPassword,
      });
    }
  }

  const fixed = results.filter((r) => r.status.startsWith("fixed")).length;
  const skipped = results.filter((r) => r.status.startsWith("skipped")).length;
  const failed = results.filter((r) => r.status.startsWith("failed")).length;

  return NextResponse.json({
    summary: { total: profiles.length, fixed, skipped, failed },
    details: results,
  });
}
