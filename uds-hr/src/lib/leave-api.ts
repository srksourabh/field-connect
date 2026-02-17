import { supabase } from "./supabase";
import type { HrLeaveRequest } from "./database.types";
import { createNotification } from "./notification-api";

export interface LeaveRequestWithProfile extends HrLeaveRequest {
  employee_name: string;
  days: number;
}

export async function getTeamLeaveRequests(
  managerId: string
): Promise<LeaveRequestWithProfile[]> {
  // Get direct reports
  const { data: reports } = await supabase
    .from("hr_profiles")
    .select("id, full_name")
    .eq("reporting_manager_id", managerId);

  if (!reports || reports.length === 0) return [];

  const reportIds = reports.map((r) => r.id);
  const nameMap = new Map(reports.map((r) => [r.id, r.full_name]));

  const { data, error } = await supabase
    .from("hr_leave_requests")
    .select()
    .in("user_id", reportIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch team leave requests error:", error);
    return [];
  }

  return (data || []).map((r) => {
    const start = new Date(r.start_date);
    const end = new Date(r.end_date);
    const days =
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return {
      ...r,
      employee_name: nameMap.get(r.user_id) || "Unknown",
      days,
    };
  });
}

export async function approveLeaveRequest(
  requestId: string,
  reviewerId: string,
  comment?: string
): Promise<boolean> {
  // 1. Get the request
  const { data: request, error: fetchError } = await supabase
    .from("hr_leave_requests")
    .select()
    .eq("id", requestId)
    .single();

  if (fetchError || !request) {
    console.error("Fetch leave request error:", fetchError);
    return false;
  }

  // 2. Update status to approved
  const { error: updateError } = await supabase
    .from("hr_leave_requests")
    .update({
      status: "approved",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      reviewer_comment: comment || null,
    })
    .eq("id", requestId);

  if (updateError) {
    console.error("Approve leave error:", updateError);
    return false;
  }

  // 3. Deduct leave balance
  const start = new Date(request.start_date);
  const end = new Date(request.end_date);
  const days =
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const usedKeyMap: Record<string, string> = {
    sick: "sick_leave_used",
    casual: "casual_leave_used",
    privilege: "privilege_leave_used",
    compoff: "compoff_used",
  };
  const usedKey = usedKeyMap[request.type] || `${request.type}_leave_used`;

  const { data: balance } = await supabase
    .from("hr_leave_balances")
    .select()
    .eq("user_id", request.user_id)
    .eq("year", new Date().getFullYear())
    .single();

  if (balance) {
    const currentUsed = (balance as Record<string, unknown>)[usedKey] as number;
    await supabase
      .from("hr_leave_balances")
      .update({ [usedKey]: currentUsed + days })
      .eq("id", balance.id);
  }

  // 4. Mark attendance records as "on-leave" for each day in the leave period
  const leaveStart = new Date(request.start_date);
  const leaveEnd = new Date(request.end_date);
  const leaveRecords: { user_id: string; created_at: string; status: string; synced: boolean }[] = [];
  for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    leaveRecords.push({
      user_id: request.user_id,
      created_at: `${dateStr}T00:00:00.000Z`,
      status: "on-leave",
      synced: true,
    });
  }

  if (leaveRecords.length > 0) {
    // Delete any existing attendance records for those dates to avoid duplicates
    for (const rec of leaveRecords) {
      const dateStr = rec.created_at.split("T")[0];
      await supabase
        .from("hr_attendance")
        .delete()
        .eq("user_id", request.user_id)
        .gte("created_at", `${dateStr}T00:00:00`)
        .lte("created_at", `${dateStr}T23:59:59`);
    }
    await supabase.from("hr_attendance").insert(leaveRecords);
  }

  // 5. Notify employee
  await createNotification({
    user_id: request.user_id,
    title: "Leave Approved",
    body: `Your ${request.type} leave from ${request.start_date} to ${request.end_date} has been approved.${comment ? ` Comment: ${comment}` : ""}`,
    type: "leave_approved",
    reference_id: requestId,
    reference_type: "leave_request",
  });

  return true;
}

export async function rejectLeaveRequest(
  requestId: string,
  reviewerId: string,
  comment?: string
): Promise<boolean> {
  // 1. Get the request for notification
  const { data: request, error: fetchError } = await supabase
    .from("hr_leave_requests")
    .select()
    .eq("id", requestId)
    .single();

  if (fetchError || !request) {
    console.error("Fetch leave request error:", fetchError);
    return false;
  }

  // 2. Update status to rejected (no balance change)
  const { error } = await supabase
    .from("hr_leave_requests")
    .update({
      status: "rejected",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      reviewer_comment: comment || null,
    })
    .eq("id", requestId);

  if (error) {
    console.error("Reject leave error:", error);
    return false;
  }

  // 3. Notify employee
  await createNotification({
    user_id: request.user_id,
    title: "Leave Rejected",
    body: `Your ${request.type} leave from ${request.start_date} to ${request.end_date} has been rejected.${comment ? ` Reason: ${comment}` : ""}`,
    type: "leave_rejected",
    reference_id: requestId,
    reference_type: "leave_request",
  });

  return true;
}

export interface LeaveBalance {
  sick_total: number;
  sick_used: number;
  casual_total: number;
  casual_used: number;
  compoff_total: number;
  compoff_used: number;
  privilege_total: number;
  privilege_used: number;
}

export async function getUserLeaveBalance(
  userId: string,
  year: number = new Date().getFullYear()
): Promise<LeaveBalance | null> {
  const { data, error } = await supabase
    .from("hr_leave_balances")
    .select()
    .eq("user_id", userId)
    .eq("year", year)
    .single();

  if (error || !data) return null;

  const d = data as Record<string, unknown>;
  return {
    sick_total: (d.sick_leave_total as number) ?? 0,
    sick_used: (d.sick_leave_used as number) ?? 0,
    casual_total: (d.casual_leave_total as number) ?? 0,
    casual_used: (d.casual_leave_used as number) ?? 0,
    compoff_total: (d.compoff_total as number) ?? 0,
    compoff_used: (d.compoff_used as number) ?? 0,
    privilege_total: (d.privilege_leave_total as number) ?? 0,
    privilege_used: (d.privilege_leave_used as number) ?? 0,
  };
}

export async function getPendingLeaveCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("hr_leave_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "pending");

  if (error) return 0;
  return count ?? 0;
}

export async function withdrawLeaveRequest(
  requestId: string,
  userId: string
): Promise<boolean> {
  // 1. Get the request to verify ownership and get manager info
  const { data: request, error: fetchError } = await supabase
    .from("hr_leave_requests")
    .select()
    .eq("id", requestId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .single();

  if (fetchError || !request) {
    console.error("Fetch leave request for withdraw error:", fetchError);
    return false;
  }

  // 2. Update status to withdrawn
  const { error } = await supabase
    .from("hr_leave_requests")
    .update({ status: "withdrawn" })
    .eq("id", requestId);

  if (error) {
    console.error("Withdraw leave error:", error);
    return false;
  }

  // 3. Notify reporting manager
  const { data: profile } = await supabase
    .from("hr_profiles")
    .select("full_name, reporting_manager_id")
    .eq("id", userId)
    .single();

  if (profile?.reporting_manager_id) {
    await createNotification({
      user_id: profile.reporting_manager_id,
      title: "Leave Request Withdrawn",
      body: `${profile.full_name} withdrew their ${request.type} leave request from ${request.start_date} to ${request.end_date}.`,
      type: "leave_withdrawn",
      reference_id: requestId,
      reference_type: "leave_request",
    });
  }

  return true;
}

export async function getUserLeaveRequests(
  userId: string
): Promise<HrLeaveRequest[]> {
  const { data, error } = await supabase
    .from("hr_leave_requests")
    .select()
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch user leave requests error:", error);
    return [];
  }
  return data || [];
}
