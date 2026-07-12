"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Wallet, Plus, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import type { SaudiPayrollRun } from "@/lib/saudi/types";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  pre_check: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ready: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function SaudiPayrollPage() {
  const [runs, setRuns] = useState<SaudiPayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadRuns();
  }, []);

  async function loadRuns() {
    const { data } = await supabase
      .from("saudi_payroll_runs")
      .select("*")
      .order("period_month", { ascending: false });
    if (data) setRuns(data);
    setLoading(false);
  }

  async function handleCreate() {
    setCreating(true);
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    await supabase.from("saudi_payroll_runs").insert({ period_month: period });
    loadRuns();
    setCreating(false);
  }

  async function handleComplete(id: string) {
    await supabase
      .from("saudi_payroll_runs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", id);
    loadRuns();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Payroll</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{runs.length} payroll runs</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Run
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : runs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
          <Wallet className="w-12 h-12 mb-3" />
          <p className="text-lg font-medium">No payroll runs yet</p>
          <p className="text-sm mt-1">Create a payroll run to process employee salaries.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700/50">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Completed</th>
                <th className="w-24 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {new Date(run.period_month + "T00:00:00").toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[run.status]}`}>
                      {run.status === "completed" ? <CheckCircle2 className="w-3 h-3" /> : run.status === "draft" ? <FileText className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {run.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">
                    {run.total_amount ? `SAR ${Number(run.total_amount).toLocaleString()}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {run.completed_at ? new Date(run.completed_at).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {run.status === "draft" && (
                      <button
                        onClick={() => handleComplete(run.id)}
                        className="text-xs text-primary hover:text-primary/80 font-medium"
                      >
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
