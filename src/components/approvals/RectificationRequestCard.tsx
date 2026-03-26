"use client";

import { Check, X, Loader2 } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";

interface RectificationRequestCardProps {
  request: {
    id: string;
    employeeName: string;
    managerName?: string;
    employeeState?: string;
    attendanceDate: string;
    rectificationType: string;
    correctedPunchIn?: string | null;
    correctedPunchOut?: string | null;
    correctedStatus?: string | null;
    reason: string;
    status: "pending" | "approved" | "rejected";
    reviewerComment?: string | null;
  };
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  actionLoadingId?: string | null;
}

const typeLabels: Record<string, string> = {
  missed_punch_in: "Missed Punch In",
  missed_punch_out: "Missed Punch Out",
  wrong_time: "Wrong Time",
  other: "Other",
};

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return "—";
  }
}

export default function RectificationRequestCard({
  request,
  onApprove,
  onReject,
  actionLoadingId,
}: RectificationRequestCardProps) {
  const typeLabel = typeLabels[request.rectificationType] || request.rectificationType;

  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-sm font-bold text-orange-600 dark:text-orange-400">
            {request.employeeName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <p className="text-sm font-semibold">{request.employeeName}</p>
            {(request.managerName || request.employeeState) && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {request.managerName && <>Mgr: {request.managerName}</>}
                {request.managerName && request.employeeState && " · "}
                {request.employeeState}
              </p>
            )}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400">
              {typeLabel}
            </span>
          </div>
        </div>
        <StatusBadge
          variant={
            request.status === "approved"
              ? "success"
              : request.status === "rejected"
              ? "error"
              : "warning"
          }
        >
          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
        </StatusBadge>
      </div>

      {/* Date & Corrected Times */}
      <div className="flex items-center justify-between text-sm mb-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
          <p className="font-medium">{request.attendanceDate}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Punch In</p>
          <p className="font-medium">{formatTime(request.correctedPunchIn)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Punch Out</p>
          <p className="font-medium">{formatTime(request.correctedPunchOut)}</p>
        </div>
        {request.correctedStatus && (
          <div className="border-l border-gray-200 dark:border-gray-700 pl-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
            <p className="font-bold text-primary capitalize">{request.correctedStatus}</p>
          </div>
        )}
      </div>

      {/* Reason */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
        {request.reason}
      </p>

      {/* Reviewer Comment */}
      {request.reviewerComment && request.status !== "pending" && (
        <div className="mb-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border-l-2 border-primary">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">
            {request.status === "approved" ? "Approval" : "Rejection"} Comment
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            {request.reviewerComment}
          </p>
        </div>
      )}

      {/* Actions */}
      {request.status === "pending" && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onApprove?.(request.id)}
            disabled={!!actionLoadingId}
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {actionLoadingId === `approve_${request.id}` ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Approving...</>
            ) : (
              <><Check className="w-4 h-4" /> Approve</>
            )}
          </button>
          <button
            onClick={() => onReject?.(request.id)}
            disabled={!!actionLoadingId}
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {actionLoadingId === `reject_${request.id}` ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Rejecting...</>
            ) : (
              <><X className="w-4 h-4" /> Reject</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
