"use client";

import type { HrLeaveRequest } from "@/lib/database.types";

const typeLabels: Record<string, string> = {
  casual: "CL",
  sick: "SL",
  privilege: "PL",
  compoff: "CO",
};

const typeBg: Record<string, string> = {
  casual: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  sick: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  privilege: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  compoff: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
};

const statusBadge: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function calcDays(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

interface LeaveHistoryListProps {
  requests: HrLeaveRequest[];
}

export default function LeaveHistoryList({ requests }: LeaveHistoryListProps) {
  if (requests.length === 0) {
    return (
      <div className="px-6 py-8 text-center text-sm text-gray-400">
        No leave requests yet
      </div>
    );
  }

  return (
    <section className="px-6 pb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
        Leave History
      </h2>
      <div className="space-y-3">
        {requests.map((req) => {
          const days = calcDays(req.start_date, req.end_date);
          return (
            <div
              key={req.id}
              className="bg-white dark:bg-[#1c2a36] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeBg[req.type] ?? "bg-gray-100 text-gray-600"}`}>
                    {typeLabels[req.type] ?? req.type}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {formatDate(req.start_date)} — {formatDate(req.end_date)}
                  </span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[req.status] ?? ""}`}>
                  {req.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {days} day{days > 1 ? "s" : ""}
                  {req.reason ? ` \u2022 ${req.reason}` : ""}
                </span>
              </div>
              {req.reviewer_comment && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic border-t border-gray-100 dark:border-gray-700 pt-2">
                  Manager: {req.reviewer_comment}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
