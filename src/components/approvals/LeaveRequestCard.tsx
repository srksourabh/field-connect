"use client";

import { Check, X, Loader2 } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";

interface LeaveRequestCardProps {
  request: {
    id: string;
    employeeName: string;
    managerName?: string;
    employeeState?: string;
    type: "sick" | "casual" | "compoff" | "privilege" | "wfh";
    startDate: string;
    endDate: string;
    reason: string;
    status: "pending" | "approved" | "rejected" | "withdrawn";
    days: number;
    reviewerComment?: string | null;
  };
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  actionLoadingId?: string | null;
}

const typeStyles: Record<string, { label: string; bg: string; text: string }> = {
  sick: { label: "Sick Leave", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-800 dark:text-red-400" },
  casual: { label: "Casual Leave", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-800 dark:text-blue-400" },
  privilege: { label: "Privilege Leave", bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-800 dark:text-purple-400" },
  compoff: { label: "Comp-Off", bg: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-800 dark:text-teal-400" },
  wfh: { label: "Work From Home", bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-800 dark:text-indigo-400" },
};

export default function LeaveRequestCard({ request, onApprove, onReject, actionLoadingId }: LeaveRequestCardProps) {
  const style = typeStyles[request.type];

  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400">
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
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.text}`}>
              {style.label}
            </span>
          </div>
        </div>
        <StatusBadge
          variant={
            request.status === "approved"
              ? "success"
              : request.status === "rejected"
              ? "error"
              : request.status === "withdrawn"
              ? "neutral"
              : "warning"
          }
        >
          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
        </StatusBadge>
      </div>

      {/* Dates */}
      <div className="flex items-center justify-between text-sm mb-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">From</p>
          <p className="font-medium">{request.startDate}</p>
        </div>
        <div className="text-xs text-gray-400 px-2">→</div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">To</p>
          <p className="font-medium">{request.endDate}</p>
        </div>
        <div className="border-l border-gray-200 dark:border-gray-700 pl-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Days</p>
          <p className="font-bold text-primary">{request.days}</p>
        </div>
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
