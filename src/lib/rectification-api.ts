import { supabase } from "./supabase";
import type { HrRectificationRequest } from "./database.types";
import { createNotification } from "./notification-api";
import { endOfDayIST, logError } from "./utils";

export interface RectificationWithProfile extends HrRectificationRequest {
  employee_name: string;
}

export async function createRectificationRequest(data: {
  user_id: string;
  attendance_date: string;
  attendance_id?: string | null;
  rectification_type: HrRectificationRequest["rectification_type"];
  original_punch_in?: string | null;
  original_punch_out?: string | null;
  corrected_punch_in?: string | null;
  corrected_punch_out?: string | null;
  corrected_status?: HrRectificationRequest["corrected_status"];
  reason: string;
}): Promise<HrRectificationRequest | null> {
  const { data: record, error } = await supabase
    .from("hr_rectification_requests")
    .insert({
      user_id: data.user_id,
      attendance_date: data.attendance_date,
      attendance_id: data.attendance_id ?? null,
      rectification_type: data.rectification_type,
      original_punch_in: data.original_punch_in ?? null,
      original_punch_out: data.original_punch_out ?? null,
      corrected_punch_in: data.corrected_punch_in ?? null,
      corrected_punch_out: data.corrected_punch_out ?? null,
      corrected_status: data.corrected_status ?? null,
      reason: data.reason,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    logError("Create rectification error:", error);
    return null;
  }
  return record;
}

export async function getUserRectificationRequests(
  userId: string
): Promise<HrRectificationRequest[]> {
  const { data, error } = await supabase
    .from("hr_rectification_requests")
    .select()
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    logError("Fetch user rectifications error:", error);
    return [];
  }
  return data || [];
}

export async function getTeamRectificationRequests(
  managerId: string
): Promise<RectificationWithProfile[]> {
  // Get direct reports first
  const { data: reports } = await supabase
    .from("hr_profiles")
    .select("id, full_name")
    .eq("reporting_manager_id", managerId);

  if (!reports || reports.length === 0) return [];

  const reportIds = reports.map((r) => r.id);
  const nameMap = new Map(reports.map((r) => [r.id, r.full_name]));

  const { data, error } = await supabase
    .from("hr_rectification_requests")
    .select()
    .in("user_id", reportIds)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    logError("Fetch team rectifications error:", error);
    return [];
  }
  return (data || []).map((r) => ({
    ...r,
    employee_name: nameMap.get(r.user_id) || "Unknown",
  }));
}

export async function approveRectificationRequest(
  requestId: string,
  reviewerId: string,
  comment?: string
): Promise<boolean> {
  // 1. Get the request
  const { data: request, error: fetchError } = await supabase
    .from("hr_rectification_requests")
    .select()
    .eq("id", requestId)
    .single();

  if (fetchError || !request) {
    logError("Fetch rectification error:", fetchError);
    return false;
  }

  // 2. Update request status to approved (only if still pending — prevents double-approval)
  const { data: updated, error: updateError } = await supabase
    .from("hr_rectification_requests")
    .update({
      status: "approved",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      reviewer_comment: comment || null,
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select();

  if (updateError) {
    logError("Approve rectification error:", updateError);
    return false;
  }
  if (!updated || updated.length === 0) {
    logError("Rectification request is no longer pending");
    return false;
  }

  // 3. Update or insert attendance record immediately
  // Build fallback timestamps from attendance_date when corrected times are null
  const fallbackPunchIn = request.corrected_punch_in || `${request.attendance_date}T09:00:00+05:30`;
  const fallbackPunchOut = request.corrected_punch_out || `${request.attendance_date}T18:00:00+05:30`;

  if (request.attendance_id) {
    // Only update punch times if corrected values were provided; always update status
    const updatePayload: Record<string, unknown> = {
      status: request.corrected_status || "present",
    };
    if (request.corrected_punch_in) updatePayload.punch_in_at = request.corrected_punch_in;
    if (request.corrected_punch_out) updatePayload.punch_out_at = request.corrected_punch_out;

    const { error: attError } = await supabase
      .from("hr_attendance")
      .update(updatePayload)
      .eq("id", request.attendance_id);

    if (attError) {
      logError("Update attendance error:", attError);
      return false;
    }

    // Also update other sessions on the same date to the corrected status
    if (request.corrected_status && request.attendance_date) {
      const dateStart = `${request.attendance_date}T00:00:00+05:30`;
      const dateEnd = endOfDayIST(request.attendance_date);
      await supabase
        .from("hr_attendance")
        .update({ status: request.corrected_status })
        .eq("user_id", request.user_id)
        .neq("id", request.attendance_id)
        .gte("created_at", dateStart)
        .lte("created_at", dateEnd);
    }
  } else {
    // Insert new attendance record with created_at set to attendance_date
    const { error: attError } = await supabase
      .from("hr_attendance")
      .insert({
        user_id: request.user_id,
        punch_in_at: fallbackPunchIn,
        punch_out_at: fallbackPunchOut,
        status: request.corrected_status || "present",
        created_at: `${request.attendance_date}T00:00:00+05:30`,
        synced: true,
      });

    if (attError) {
      logError("Insert attendance error:", attError);
      return false;
    }
  }

  // 4. Notify employee
  await createNotification({
    user_id: request.user_id,
    title: "Rectification Approved",
    body: `Your rectification for ${request.attendance_date} has been approved.${comment ? ` Comment: ${comment}` : ""}`,
    type: "rectification_approved",
    reference_id: requestId,
    reference_type: "rectification_request",
  });

  return true;
}

export async function rejectRectificationRequest(
  requestId: string,
  reviewerId: string,
  comment?: string
): Promise<boolean> {
  // 1. Get the request for notification
  const { data: request, error: fetchError } = await supabase
    .from("hr_rectification_requests")
    .select()
    .eq("id", requestId)
    .single();

  if (fetchError || !request) {
    logError("Fetch rectification error:", fetchError);
    return false;
  }

  // 2. Update status (only if still pending — prevents rejecting after approval)
  const { data: updated, error } = await supabase
    .from("hr_rectification_requests")
    .update({
      status: "rejected",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      reviewer_comment: comment || null,
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select();

  if (error) {
    logError("Reject rectification error:", error);
    return false;
  }
  if (!updated || updated.length === 0) {
    logError("Rectification request is no longer pending");
    return false;
  }

  // 3. Notify employee
  await createNotification({
    user_id: request.user_id,
    title: "Rectification Rejected",
    body: `Your rectification for ${request.attendance_date} has been rejected.${comment ? ` Reason: ${comment}` : ""}`,
    type: "rectification_rejected",
    reference_id: requestId,
    reference_type: "rectification_request",
  });

  return true;
}
