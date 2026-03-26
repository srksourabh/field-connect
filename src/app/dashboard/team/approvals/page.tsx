"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import ApprovalSummaryCards from "@/components/approvals/ApprovalSummaryCards";
import LeaveRequestCard from "@/components/approvals/LeaveRequestCard";
import RectificationRequestCard from "@/components/approvals/RectificationRequestCard";
import { useAuth } from "@/lib/auth";
import {
  getTeamLeaveRequests,
  type LeaveRequestWithProfile,
} from "@/lib/leave-api";
import {
  getTeamRectificationRequests,
  type RectificationWithProfile,
} from "@/lib/rectification-api";
import { showPrompt } from "@/components/ui/Dialog";
import { showToast } from "@/components/ui/Toast";

type Category = "leave" | "rectification";

export default function ApprovalsPage() {
  const { user, session } = useAuth();
  const [category, setCategory] = useState<Category>("leave");
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestWithProfile[]>([]);
  const [rectRequests, setRectRequests] = useState<RectificationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [leaves, rects] = await Promise.all([
      getTeamLeaveRequests(user.id),
      getTeamRectificationRequests(user.id),
    ]);
    setLeaveRequests(leaves);
    setRectRequests(rects);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Server-side action helper
  const doAction = async (endpoint: string, requestId: string, action: string, comment?: string): Promise<boolean> => {
    if (!session?.access_token) return false;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ requestId, action, comment: comment || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Action failed", "error");
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  // Leave handlers
  const handleLeaveApprove = async (id: string) => {
    if (!user) return;
    const comment = await showPrompt("Approve Leave", "Add a comment (optional):", "Comment...");
    if (comment === null) return;
    setActionLoadingId(`approve_${id}`);
    const ok = await doAction("/api/admin/leave-action", id, "approve", comment || undefined);
    setActionLoadingId(null);
    if (ok) {
      showToast("Leave request approved", "success");
      fetchRequests();
    }
  };

  const handleLeaveReject = async (id: string) => {
    if (!user) return;
    const comment = await showPrompt("Reject Leave", "Reason for rejection (optional):", "Reason...");
    if (comment === null) return;
    setActionLoadingId(`reject_${id}`);
    const ok = await doAction("/api/admin/leave-action", id, "reject", comment || undefined);
    setActionLoadingId(null);
    if (ok) {
      showToast("Leave request rejected", "success");
      fetchRequests();
    }
  };

  // Rectification handlers
  const handleRectApprove = async (id: string) => {
    if (!user) return;
    const comment = await showPrompt("Approve Rectification", "Add a comment (optional):", "Comment...");
    if (comment === null) return;
    setActionLoadingId(`approve_${id}`);
    const ok = await doAction("/api/admin/rectification-action", id, "approve", comment || undefined);
    setActionLoadingId(null);
    if (ok) {
      showToast("Rectification approved", "success");
      fetchRequests();
    }
  };

  const handleRectReject = async (id: string) => {
    if (!user) return;
    const comment = await showPrompt("Reject Rectification", "Reason for rejection (optional):", "Reason...");
    if (comment === null) return;
    setActionLoadingId(`reject_${id}`);
    const ok = await doAction("/api/admin/rectification-action", id, "reject", comment || undefined);
    setActionLoadingId(null);
    if (ok) {
      showToast("Rectification rejected", "success");
      fetchRequests();
    }
  };

  // Counts
  const leavePending = leaveRequests.filter((r) => r.status === "pending");
  const leaveHistory = leaveRequests.filter((r) => r.status !== "pending");
  const rectPending = rectRequests.filter((r) => r.status === "pending");
  const rectHistory = rectRequests.filter((r) => r.status !== "pending");

  const totalPending = leavePending.length + rectPending.length;
  const totalApproved = leaveRequests.filter((r) => r.status === "approved").length +
    rectRequests.filter((r) => r.status === "approved").length;
  const totalRequests = leaveRequests.length + rectRequests.length;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link
          href="/dashboard/team"
          className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-lg font-semibold text-center flex-1">
          Approvals
        </h1>
        <div className="w-9" />
      </header>

      {/* Summary Cards */}
      <div className="pt-4">
        <ApprovalSummaryCards
          pending={totalPending}
          approved={totalApproved}
          teamCapacity={totalRequests > 0 ? Math.round(((totalRequests - totalPending) / Math.max(totalRequests, 1)) * 100) : 100}
        />
      </div>

      {/* Category Selector (Leave / Rectification) */}
      <div className="px-6 mb-3">
        <div className="bg-gray-200 dark:bg-gray-800 p-1 rounded-lg flex">
          <button
            onClick={() => setCategory("leave")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              category === "leave"
                ? "bg-white dark:bg-surface-dark text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            Leave {leavePending.length > 0 && `(${leavePending.length})`}
          </button>
          <button
            onClick={() => setCategory("rectification")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              category === "rectification"
                ? "bg-white dark:bg-surface-dark text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            Rectification {rectPending.length > 0 && `(${rectPending.length})`}
          </button>
        </div>
      </div>

      {/* Pending / History Tab */}
      <div className="px-6 mb-4">
        <div className="bg-gray-200 dark:bg-gray-800 p-1 rounded-lg flex">
          <button
            onClick={() => setTab("pending")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "pending"
                ? "bg-white dark:bg-surface-dark text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            Pending ({category === "leave" ? leavePending.length : rectPending.length})
          </button>
          <button
            onClick={() => setTab("history")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "history"
                ? "bg-white dark:bg-surface-dark text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            History
          </button>
        </div>
      </div>

      {/* Request List */}
      <div className="px-6 space-y-4 pb-8">
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">Loading...</p>
          </div>
        ) : (
          <>
            {category === "leave" && (
              <>
                {(tab === "pending" ? leavePending : leaveHistory).map((request) => (
                  <LeaveRequestCard
                    key={request.id}
                    request={{
                      id: request.id,
                      employeeName: request.employee_name,
                      managerName: request.manager_name,
                      employeeState: request.employee_state,
                      type: request.type,
                      startDate: request.start_date,
                      endDate: request.end_date,
                      reason: request.reason || "",
                      status: request.status,
                      days: request.days,
                      reviewerComment: request.reviewer_comment,
                    }}
                    onApprove={handleLeaveApprove}
                    onReject={handleLeaveReject}
                    actionLoadingId={actionLoadingId}
                  />
                ))}
                {(tab === "pending" ? leavePending : leaveHistory).length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-sm">No {tab} leave requests</p>
                  </div>
                )}
              </>
            )}

            {category === "rectification" && (
              <>
                {(tab === "pending" ? rectPending : rectHistory).map((request) => (
                  <RectificationRequestCard
                    key={request.id}
                    request={{
                      id: request.id,
                      employeeName: request.employee_name,
                      managerName: request.manager_name,
                      employeeState: request.employee_state,
                      attendanceDate: request.attendance_date,
                      rectificationType: request.rectification_type,
                      correctedPunchIn: request.corrected_punch_in,
                      correctedPunchOut: request.corrected_punch_out,
                      correctedStatus: request.corrected_status,
                      reason: request.reason,
                      status: request.status as "pending" | "approved" | "rejected",
                      reviewerComment: request.reviewer_comment,
                    }}
                    onApprove={handleRectApprove}
                    onReject={handleRectReject}
                    actionLoadingId={actionLoadingId}
                  />
                ))}
                {(tab === "pending" ? rectPending : rectHistory).length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-sm">No {tab} rectification requests</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
