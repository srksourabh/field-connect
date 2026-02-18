import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
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
    .select("full_name, phone, project_id")
    .eq("id", userId)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!isUniversal && targetProfile.project_id !== callerProfile.project_id) {
    return NextResponse.json({ error: "You can only manage employees in your project" }, { status: 403 });
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

  // Reset password via Supabase Admin API
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Invalidate all existing sessions so the user must log in with the new password
  try { await supabaseAdmin.auth.admin.signOut(userId, { scope: "global" } as never); } catch { /* best-effort */ }

  return NextResponse.json({ success: true });
}
