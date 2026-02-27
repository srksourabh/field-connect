import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { endOfDayIST } from "@/lib/utils";

export async function POST(req: NextRequest) {
  // Auth
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.split(" ")[1]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify caller is active
  const { data: callerProfile } = await supabaseAdmin
    .from("hr_profiles")
    .select("id, role, designation")
    .eq("id", user.id)
    .is("deactivated_at", null)
    .single();

  if (!callerProfile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { requestId, action, comment } = body;
  if (!requestId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Fetch the rectification request
  const { data: request, error: fetchError } = await supabaseAdmin
    .from("hr_rectification_requests")
    .select()
    .eq("id", requestId)
    .single();

  if (fetchError || !request) {
    return NextResponse.json({ error: "Rectification request not found" }, { status: 404 });
  }

  // Verify reviewer is the employee's reporting manager (or super_admin/HR)
  const isUniversal = callerProfile.role === "super_admin" ||
    (callerProfile.designation?.toLowerCase().includes("hr") &&
      ["admin", "super_admin"].includes(callerProfile.role));

  if (!isUniversal) {
    const { data: empProfile } = await supabaseAdmin
      .from("hr_profiles")
      .select("reporting_manager_id")
      .eq("id", request.user_id)
      .single();

    if (!empProfile || empProfile.reporting_manager_id !== callerProfile.id) {
      return NextResponse.json({ error: "You can only review requests from your direct reports" }, { status: 403 });
    }
  }

  if (action === "reject") {
    const { data: updated, error } = await supabaseAdmin
      .from("hr_rectification_requests")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        reviewer_comment: comment || null,
      })
      .eq("id", requestId)
      .eq("status", "pending")
      .select();

    if (error || !updated?.length) {
      return NextResponse.json({ error: "Failed to reject or request is no longer pending" }, { status: 400 });
    }

    await supabaseAdmin.from("hr_notifications").insert({
      user_id: request.user_id,
      title: "Rectification Rejected",
      body: `Your rectification for ${request.attendance_date} has been rejected.${comment ? ` Reason: ${comment}` : ""}`,
      type: "rectification_rejected",
      reference_id: requestId,
      reference_type: "rectification_request",
    });

    return NextResponse.json({ success: true });
  }

  // Approve flow
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("hr_rectification_requests")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      reviewer_comment: comment || null,
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select();

  if (updateError || !updated?.length) {
    return NextResponse.json({ error: "Failed to approve or request is no longer pending" }, { status: 400 });
  }

  // Update or insert attendance record
  if (request.attendance_id) {
    const { error: attError } = await supabaseAdmin
      .from("hr_attendance")
      .update({
        punch_in_at: request.corrected_punch_in,
        punch_out_at: request.corrected_punch_out,
        status: request.corrected_status || "present",
      })
      .eq("id", request.attendance_id);

    if (attError) {
      return NextResponse.json({ error: "Failed to update attendance" }, { status: 500 });
    }

    // Update other sessions on same date
    if (request.corrected_status && request.attendance_date) {
      const dateStart = `${request.attendance_date}T00:00:00+05:30`;
      const dateEnd = endOfDayIST(request.attendance_date);
      await supabaseAdmin
        .from("hr_attendance")
        .update({ status: request.corrected_status })
        .eq("user_id", request.user_id)
        .neq("id", request.attendance_id)
        .gte("created_at", dateStart)
        .lte("created_at", dateEnd);
    }
  } else {
    const { error: attError } = await supabaseAdmin
      .from("hr_attendance")
      .insert({
        user_id: request.user_id,
        punch_in_at: request.corrected_punch_in,
        punch_out_at: request.corrected_punch_out,
        status: request.corrected_status || "present",
        synced: true,
      });

    if (attError) {
      return NextResponse.json({ error: "Failed to insert attendance" }, { status: 500 });
    }
  }

  await supabaseAdmin.from("hr_notifications").insert({
    user_id: request.user_id,
    title: "Rectification Approved",
    body: `Your rectification for ${request.attendance_date} has been approved.${comment ? ` Comment: ${comment}` : ""}`,
    type: "rectification_approved",
    reference_id: requestId,
    reference_type: "rectification_request",
  });

  return NextResponse.json({ success: true });
}
