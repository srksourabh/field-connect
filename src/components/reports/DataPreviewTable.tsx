"use client";

import StatusBadge from "@/components/ui/StatusBadge";

type ReportStatus = "present" | "absent" | "late" | "half-day" | "on-leave" | "holiday" | "lwp";

interface ReportRow {
  name: string;
  date: string;
  punchIn: string;
  punchOut: string;
  hours: string;
  status: ReportStatus;
}

interface DataPreviewTableProps {
  rows: ReportRow[];
  total: number;
}

const statusVariant: Record<ReportStatus, "success" | "error" | "warning" | "info"> = {
  present: "success",
  absent: "error",
  late: "warning",
  "half-day": "warning",
  "on-leave": "info",
  holiday: "info",
  lwp: "error",
};

export default function DataPreviewTable({ rows, total }: DataPreviewTableProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700/50">
        <h3 className="text-sm font-semibold">Data Preview</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
          {rows.length} of {total}
        </span>
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-900 text-xs text-gray-500 dark:text-gray-400">
              <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Employee</th>
              <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Date</th>
              <th className="text-left py-3 px-4 font-medium whitespace-nowrap">In</th>
              <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Out</th>
              <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Hours</th>
              <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <td className="py-3 px-4 font-medium whitespace-nowrap">{row.name}</td>
                <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{row.date}</td>
                <td className="py-3 px-4 whitespace-nowrap">{row.punchIn}</td>
                <td className="py-3 px-4 whitespace-nowrap">{row.punchOut}</td>
                <td className="py-3 px-4 whitespace-nowrap">{row.hours}</td>
                <td className="py-3 px-4">
                  <StatusBadge variant={statusVariant[row.status] || "neutral"}>
                    {row.status.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("-")}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
