import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { toISTDateStr, calcLeaveDays } from "@/lib/utils";

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
    .select("id, role, designation, reporting_manager_id")
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

  // Fetch the leave request
  const { data: request, error: fetchError } = await supabaseAdmin
    .from("hr_leave_requests")
    .select()
    .eq("id", requestId)
    .single();

  if (fetchError || !request) {
    return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
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
    // Reject: update status
    const { data: updated, error } = await supabaseAdmin
      .from("hr_leave_requests")
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

    // Notify employee
    await supabaseAdmin.from("hr_notifications").insert({
      user_id: request.user_id,
      title: "Leave Rejected",
      body: `Your ${request.type} leave from ${request.start_date} to ${request.end_date} has been rejected.${comment ? ` Reason: ${comment}` : ""}`,
      type: "leave_rejected",
      reference_id: requestId,
      reference_type: "leave_request",
    });

    return NextResponse.json({ success: true });
  }

  // Approve flow
  // Check for overlapping approved leaves
  const { data: overlapping } = await supabaseAdmin
    .from("hr_leave_requests")
    .select("id")
    .eq("user_id", request.user_id)
    .eq("status", "approved")
    .lte("start_date", request.end_date)
    .gte("end_date", request.start_date)
    .limit(1);

  if (overlapping && overlapping.length > 0) {
    return NextResponse.json({ error: "Overlapping approved leave exists" }, { status: 400 });
  }

  // Update status to approved (only if still pending)
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("hr_leave_requests")
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

  // Deduct leave balance (UTC-safe day calculation)
  const days = calcLeaveDays(request.start_date, request.end_date);

  const usedKeyMap: Record<string, string> = {
    sick: "sick_leave_used",
    casual: "casual_leave_used",
    privilege: "privilege_leave_used",
    compoff: "compoff_used",
    wfh: "wfh_used",
  };
  const usedKey = usedKeyMap[request.type];

  if (usedKey) {
    const requestYear = new Date(request.start_date).getFullYear();
    const { data: balance } = await supabaseAdmin
      .from("hr_leave_balances")
      .select()
      .eq("user_id", request.user_id)
      .eq("year", requestYear)
      .maybeSingle();

    if (balance) {
      const currentUsed = (balance as Record<string, unknown>)[usedKey] as number;
      const totalKey = usedKey.replace("_used", "_total");
      const totalAllowed = (balance as Record<string, unknown>)[totalKey] as number;

      if (currentUsed + days > totalAllowed) {
        // Rollback approval — insufficient balance
        await supabaseAdmin
          .from("hr_leave_requests")
          .update({ status: "pending", reviewed_by: null, reviewed_at: null, reviewer_comment: null })
          .eq("id", requestId);
        return NextResponse.json({ error: "Insufficient leave balance" }, { status: 400 });
      }

      const { data: balanceUpdated, error: balErr } = await supabaseAdmin
        .from("hr_leave_balances")
        .update({ [usedKey]: currentUsed + days })
        .eq("id", balance.id)
        .eq(usedKey, currentUsed)
        .select();

      if (balErr || !balanceUpdated?.length) {
        await supabaseAdmin
          .from("hr_leave_requests")
          .update({ status: "pending", reviewed_by: null, reviewed_at: null, reviewer_comment: null })
          .eq("id", requestId);
        return NextResponse.json({ error: "Concurrent update detected, please retry" }, { status: 409 });
      }
    }
  }

  // Insert attendance records (on-leave for regular leave, present for WFH)
  const isWfh = request.type === "wfh";
  const leaveStart = new Date(request.start_date);
  const leaveEnd = new Date(request.end_date);
  for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
    const dateStr = toISTDateStr(d);
    const istTimestamp = `${dateStr}T00:00:00+05:30`;

    const { data: existing } = await supabaseAdmin
      .from("hr_attendance")
      .select("id")
      .eq("user_id", request.user_id)
      .gte("created_at", `${dateStr}T00:00:00+05:30`)
      .lte("created_at", `${dateStr}T23:59:59+05:30`)
      .limit(1);

    if (!existing || existing.length === 0) {
      await supabaseAdmin.from("hr_attendance").insert({
        user_id: request.user_id,
        created_at: istTimestamp,
        punch_in_at: istTimestamp,
        status: isWfh ? "present" : "on-leave",
        synced: true,
      });
    }
  }

  // Notify employee
  await supabaseAdmin.from("hr_notifications").insert({
    user_id: request.user_id,
    title: "Leave Approved",
    body: `Your ${request.type} leave from ${request.start_date} to ${request.end_date} has been approved.${comment ? ` Comment: ${comment}` : ""}`,
    type: "leave_approved",
    reference_id: requestId,
    reference_type: "leave_request",
  });

  return NextResponse.json({ success: true });
}
