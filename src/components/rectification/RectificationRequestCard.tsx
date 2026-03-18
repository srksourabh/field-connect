"use client";

import { Check, X, Loader2 } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";

interface RectificationRequestCardProps {
  request: {
    id: string;
    employeeName: string;
    rectificationType: "missed_punch_in" | "missed_punch_out" | "wrong_time" | "other";
    attendanceDate: string;
    originalPunchIn: string | null;
    originalPunchOut: string | null;
    correctedPunchIn: string | null;
    correctedPunchOut: string | null;
    correctedStatus: string;
    reason: string;
    status: "pending" | "approved" | "rejected";
  };
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  actionLoadingId?: string | null;
}

const typeStyles = {
  missed_punch_in: { label: "Missed Punch In", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-800 dark:text-amber-400" },
  missed_punch_out: { label: "Missed Punch Out", bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-800 dark:text-orange-400" },
  wrong_time: { label: "Wrong Time", bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-800 dark:text-rose-400" },
  other: { label: "Other", bg: "bg-gray-100 dark:bg-gray-700/50", text: "text-gray-800 dark:text-gray-300" },
};

export default function RectificationRequestCard({
  request,
  onApprove,
  onReject,
  actionLoadingId,
}: RectificationRequestCardProps) {
  const style = typeStyles[request.rectificationType];

  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-sm font-bold text-amber-600 dark:text-amber-400">
            {request.employeeName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <p className="text-sm font-semibold">{request.employeeName}</p>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.text}`}
            >
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
              : "warning"
          }
        >
          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
        </StatusBadge>
      </div>

      {/* Date */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        Date: <span className="font-medium text-gray-700 dark:text-gray-200">{request.attendanceDate}</span>
      </div>

      {/* Corrected Status */}
      {request.correctedStatus && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-3">
          <p className="text-xs">
            <span className="text-gray-500 dark:text-gray-400">Requested Status:</span>{" "}
            <span className="font-medium text-primary capitalize">{request.correctedStatus === "half-day" ? "Half Day" : "Present (Full Day)"}</span>
          </p>
        </div>
      )}

      {/* Reason */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
        {request.reason}
      </p>

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
