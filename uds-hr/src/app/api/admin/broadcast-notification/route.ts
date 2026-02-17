import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  const { title, body, projects, designations } = await req.json();

  if (!title || !body) {
    return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
    .select("role, designation")
    .eq("id", caller.id)
    .single();

  if (!callerProfile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Only super_admin or HR can broadcast
  const isUniversal = callerProfile.role === "super_admin" ||
    (callerProfile.designation?.toLowerCase().includes("hr") &&
      ["admin", "super_admin"].includes(callerProfile.role));

  if (!isUniversal) {
    return NextResponse.json({ error: "Only super admins and HR can broadcast notifications" }, { status: 403 });
  }

  // Build query to find target users
  let query = supabaseAdmin
    .from("hr_profiles")
    .select("id")
    .is("deactivated_at", null);

  // Filter by projects
  if (projects && projects.length > 0 && !projects.includes("all")) {
    query = query.in("project_id", projects);
  }

  // Filter by designations
  if (designations && designations.length > 0 && !designations.includes("all")) {
    query = query.in("designation", designations);
  }

  const { data: targets, error: queryError } = await query;

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  if (!targets || targets.length === 0) {
    return NextResponse.json({ error: "No matching employees found" }, { status: 404 });
  }

  // Batch insert notifications
  const notifications = targets.map((t) => ({
    user_id: t.id,
    title,
    body,
    type: "announcement",
    is_read: false,
  }));

  const { error: insertError } = await supabaseAdmin
    .from("hr_notifications")
    .insert(notifications);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    recipientCount: targets.length,
    message: `Notification sent to ${targets.length} employees`,
  });
}
