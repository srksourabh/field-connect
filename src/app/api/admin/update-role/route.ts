import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  // 1. Parse body
  let userId: string, newRole: string;
  try {
    const body = await req.json();
    userId = body.userId;
    newRole = body.newRole;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!userId || !newRole || !["employee", "manager", "admin", "super_admin"].includes(newRole)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // 2. Verify the caller is an admin by checking the auth token
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  const { data: { user: callerUser } } = await supabaseAdmin.auth.getUser(token);

  if (!callerUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Verify caller is admin
  const { data: callerProfile } = await supabaseAdmin
    .from("hr_profiles")
    .select("role, project_id, designation")
    .eq("id", callerUser.id)
    .is("deactivated_at", null)
    .single();

  if (!callerProfile || !["admin", "super_admin"].includes(callerProfile.role)) {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
  }

  // Only super_admin can assign super_admin or admin roles
  if (newRole === "super_admin" && callerProfile.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admins can assign super_admin role" }, { status: 403 });
  }
  if (newRole === "admin" && callerProfile.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admins can assign admin role" }, { status: 403 });
  }

  // Project scoping: regular admins can only change roles within their project
  const isUniversal = callerProfile.role === "super_admin" ||
    (callerProfile.designation?.toLowerCase().includes("hr") &&
      ["admin", "super_admin"].includes(callerProfile.role));

  if (!isUniversal) {
    const { data: targetProfile } = await supabaseAdmin
      .from("hr_profiles")
      .select("project_id")
      .eq("id", userId)
      .single();
    if (!targetProfile || targetProfile.project_id !== callerProfile.project_id) {
      return NextResponse.json({ error: "You can only manage employees in your project" }, { status: 403 });
    }
  }

  // 4. Update the target user's role
  const { error } = await supabaseAdmin
    .from("hr_profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, role: newRole });
}
