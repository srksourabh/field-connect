"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import ApprovalSummaryCards from "@/components/approvals/ApprovalSummaryCards";
import LeaveRequestCard from "@/components/approvals/LeaveRequestCard";
import { useAuth } from "@/lib/auth";
import {
  getTeamLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  type LeaveRequestWithProfile,
} from "@/lib/leave-api";
import { showPrompt } from "@/components/ui/Dialog";
import { showToast } from "@/components/ui/Toast";

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [requests, setRequests] = useState<LeaveRequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await getTeamLeaveRequests(user.id);
    setRequests(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const historyRequests = requests.filter((r) => r.status !== "pending");

  const handleApprove = async (id: string) => {
    if (!user) return;
    const comment = await showPrompt("Approve Leave", "Add a comment (optional):", "Comment...");
    if (comment === null) return; // cancelled
    const ok = await approveLeaveRequest(id, user.id, comment || undefined);
    if (ok) {
      showToast("Leave request approved", "success");
      fetchRequests();
    } else {
      showToast("Failed to approve. Please try again.", "error");
    }
  };

  const handleReject = async (id: string) => {
    if (!user) return;
    const comment = await showPrompt("Reject Leave", "Reason for rejection (optional):", "Reason...");
    if (comment === null) return; // cancelled
    const ok = await rejectLeaveRequest(id, user.id, comment || undefined);
    if (ok) {
      showToast("Leave request rejected", "success");
      fetchRequests();
    } else {
      showToast("Failed to reject. Please try again.", "error");
    }
  };

  const pendingCount = pendingRequests.length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;

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
          Leave Approvals
        </h1>
        <div className="w-9" />
      </header>

      {/* Summary Cards */}
      <div className="pt-4">
        <ApprovalSummaryCards
          pending={pendingCount}
          approved={approvedCount}
          teamCapacity={requests.length > 0 ? Math.round(((requests.length - pendingCount) / Math.max(requests.length, 1)) * 100) : 100}
        />
      </div>

      {/* Tab Selector */}
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
            Pending ({pendingCount})
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
            {(tab === "pending" ? pendingRequests : historyRequests).map(
              (request) => (
                <LeaveRequestCard
                  key={request.id}
                  request={{
                    id: request.id,
                    employeeName: request.employee_name,
                    type: request.type,
                    startDate: request.start_date,
                    endDate: request.end_date,
                    reason: request.reason || "",
                    status: request.status,
                    days: request.days,
                    reviewerComment: request.reviewer_comment,
                  }}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              )
            )}
            {(tab === "pending" ? pendingRequests : historyRequests).length ===
              0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm">No {tab} requests</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
