"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import ApprovalSummaryCards from "@/components/approvals/ApprovalSummaryCards";
import LeaveRequestCard from "@/components/approvals/LeaveRequestCard";
import RectificationRequestCard from "@/components/approvals/RectificationRequestCard";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
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
import { todayIST } from "@/lib/utils";

type Category = "leave" | "rectification" | "override";

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

      {/* Category Selector (Leave / Rectification / Override) */}
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
          <button
            onClick={() => setCategory("override")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              category === "override"
                ? "bg-white dark:bg-surface-dark text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            Override
          </button>
        </div>
      </div>

      {/* Pending / History Tab — hidden for override */}
      {category !== "override" && (
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
      )}

      {/* Request List */}
      <div className="px-6 space-y-4 pb-8">
        {category === "override" ? (
          <AttendanceOverrideSection session={session} userId={user?.id} />
        ) : loading ? (
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

/** Attendance Override section — allows manager/admin to change status for a team member */
function AttendanceOverrideSection({ session, userId }: { session: { access_token: string } | null; userId?: string }) {
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayIST());
  const [selectedStatus, setSelectedStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingEmployees, setFetchingEmployees] = useState(true);

  // Fetch direct reports (team members under this manager)
  useEffect(() => {
    async function fetchTeam() {
      if (!userId) return;
      const { data } = await supabase
        .from("hr_profiles")
        .select("id, full_name")
        .eq("reporting_manager_id", userId)
        .is("deactivated_at", null)
        .order("full_name");
      setEmployees(data || []);
      setFetchingEmployees(false);
    }
    fetchTeam();
  }, [userId]);

  const handleOverride = async () => {
    if (!selectedEmployee || !selectedDate || !selectedStatus || !session?.access_token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/attendance-override", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: selectedEmployee,
          date: selectedDate,
          status: selectedStatus,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Attendance updated", "success");
        setSelectedEmployee("");
        setSelectedStatus("");
      } else {
        showToast(data.error || "Failed to update", "error");
      }
    } catch {
      showToast("Failed to update attendance", "error");
    }
    setLoading(false);
  };

  if (fetchingEmployees) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
        <p className="text-sm">Loading team...</p>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-sm">No direct reports found</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-1">Override Attendance</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">Change attendance status for your team members</p>
      </div>

      {/* Employee selector */}
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Employee</label>
        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Select employee...</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.full_name}</option>
          ))}
        </select>
      </div>

      {/* Date */}
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          max={todayIST()}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 dark:[color-scheme:dark]"
        />
      </div>

      {/* Status */}
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">New Status</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "present", label: "Present", color: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800" },
            { value: "half-day", label: "Half Day", color: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800" },
            { value: "absent", label: "Absent", color: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800" },
            { value: "late", label: "Late", color: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
            { value: "lwp", label: "LWP", color: "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedStatus(opt.value)}
              className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                selectedStatus === opt.value
                  ? `${opt.color} ring-2 ring-offset-1 ring-primary/50`
                  : "bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleOverride}
        disabled={!selectedEmployee || !selectedDate || !selectedStatus || loading}
        className="w-full py-3 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "Updating..." : "Update Attendance"}
      </button>
    </div>
  );
}
