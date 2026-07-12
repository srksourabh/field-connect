"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { CalendarCheck, Check, X } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export default function SaudiLeavePage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<{
    id: string;
    start_date: string;
    end_date: string;
    status: string;
    employee_id: string;
    saudi_employees?: { full_name: string } | null;
    saudi_leave_types?: { name: string; days_allowed: number } | null;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    let query = supabase
      .from("saudi_leave_requests")
      .select("*, saudi_employees(full_name), saudi_leave_types(name, days_allowed)")
      .order("created_at", { ascending: false });

    if (filter) query = query.eq("status", filter);

    const { data } = await query;
    if (data) setRequests(data);
    setLoading(false);
  }

  async function handleStatus(id: string, status: "approved" | "rejected") {
    await supabase
      .from("saudi_leave_requests")
      .update({ status, approved_by_user_id: user?.id })
      .eq("id", id);
    loadRequests();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Leave Requests</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{requests.length} total requests</p>
        </div>
      </div>

      <div className="flex gap-2">
        {["", "pending", "approved", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); loadRequests(); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === s
                ? "bg-primary text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
          <CalendarCheck className="w-12 h-12 mb-3" />
          <p className="text-lg font-medium">No leave requests</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700/50">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Dates</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Days</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="w-24 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
              {requests.map((req) => {
                const start = new Date(req.start_date);
                const end = new Date(req.end_date);
                const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                return (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {req.saudi_employees?.full_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {req.saudi_leave_types?.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {req.start_date} - {req.end_date}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{days}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[req.status]}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {req.status === "pending" && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleStatus(req.id, "approved")}
                            className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30"
                            title="Approve"
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </button>
                          <button
                            onClick={() => handleStatus(req.id, "rejected")}
                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                            title="Reject"
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
