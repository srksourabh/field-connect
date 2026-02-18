import { supabase } from "./supabase";
import type { HrRectificationRequest } from "./database.types";
import { createNotification } from "./notification-api";

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
    console.error("Create rectification error:", error);
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
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch user rectifications error:", error);
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
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch team rectifications error:", error);
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
    console.error("Fetch rectification error:", fetchError);
    return false;
  }

  // 2. Update request status to approved
  const { error: updateError } = await supabase
    .from("hr_rectification_requests")
    .update({
      status: "approved",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      reviewer_comment: comment || null,
    })
    .eq("id", requestId);

  if (updateError) {
    console.error("Approve rectification error:", updateError);
    return false;
  }

  // 3. Update or insert attendance record immediately
  if (request.attendance_id) {
    // Update the specific session
    const { error: attError } = await supabase
      .from("hr_attendance")
      .update({
        punch_in_at: request.corrected_punch_in,
        punch_out_at: request.corrected_punch_out,
        status: request.corrected_status || "present",
      })
      .eq("id", request.attendance_id);

    if (attError) {
      console.error("Update attendance error:", attError);
      return false;
    }

    // Also update other sessions on the same date to the corrected status
    if (request.corrected_status && request.attendance_date) {
      const dateStart = `${request.attendance_date}T00:00:00+05:30`;
      const dateEnd = `${request.attendance_date}T23:59:59+05:30`;
      await supabase
        .from("hr_attendance")
        .update({ status: request.corrected_status })
        .eq("user_id", request.user_id)
        .neq("id", request.attendance_id)
        .gte("created_at", dateStart)
        .lte("created_at", dateEnd);
    }
  } else {
    const { error: attError } = await supabase
      .from("hr_attendance")
      .insert({
        user_id: request.user_id,
        punch_in_at: request.corrected_punch_in,
        punch_out_at: request.corrected_punch_out,
        status: request.corrected_status || "present",
        synced: true,
      });

    if (attError) {
      console.error("Insert attendance error:", attError);
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
    console.error("Fetch rectification error:", fetchError);
    return false;
  }

  // 2. Update status
  const { error } = await supabase
    .from("hr_rectification_requests")
    .update({
      status: "rejected",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      reviewer_comment: comment || null,
    })
    .eq("id", requestId);

  if (error) {
    console.error("Reject rectification error:", error);
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
