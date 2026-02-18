import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { fullName, email, phone, designation, department, project, role, reportingManagerId } = body;

  if (!fullName || !email || !phone) {
    return NextResponse.json(
      { error: "Name, email, and phone are required." },
      { status: 400 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // Verify caller is admin
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
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  // Project scoping: regular admin can only add to their own project
  const isUniversal = callerProfile.role === "super_admin" ||
    (callerProfile.designation?.toLowerCase().includes("hr") ?? false);
  const effectiveProject = isUniversal ? (project || null) : (callerProfile.project_id || project || null);

  // Generate default password: first 4 of name + last 4 of phone
  const namePart = fullName.replace(/\s+/g, "").slice(0, 4).toLowerCase();
  const phonePart = (phone || "0000").replace(/\D/g, "").slice(-4);
  const defaultPassword = namePart + phonePart;

  if (defaultPassword.length < 6) {
    return NextResponse.json(
      { error: "Name or phone too short to generate a valid password." },
      { status: 400 }
    );
  }

  // Create auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: defaultPassword,
    email_confirm: true,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const userId = authData.user.id;

  // Create profile
  const { error: profileError } = await supabaseAdmin.from("hr_profiles").insert({
    id: userId,
    full_name: fullName,
    email,
    phone,
    designation: designation || null,
    department: department || null,
    project_id: effectiveProject,
    role: role || "employee",
    reporting_manager_id: reportingManagerId || null,
  });

  if (profileError) {
    // Clean up orphaned auth user
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Create leave balance
  await supabaseAdmin.from("hr_leave_balances").insert({
    user_id: userId,
    year: new Date().getFullYear(),
  });

  return NextResponse.json({
    success: true,
    message: `${fullName} added successfully. Default password: ${defaultPassword}`,
    defaultPassword,
  });
}
