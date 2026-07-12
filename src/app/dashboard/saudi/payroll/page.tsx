"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Wallet, Plus, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import type { SaudiPayrollRun } from "@/lib/saudi/types";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  pre_check: "bg-blue-100 text-blue-700",
  ready: "bg-green-100 text-green-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 font-satoshi">Payroll</h1>
          <p className="text-slate-400 text-sm mt-1">{runs.length} payroll runs</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="inline-flex items-center gap-2 bg-forest text-white rounded-full px-6 py-2.5 font-medium hover:bg-forest-dark disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Run
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-forest border-t-transparent rounded-full animate-spin" />
        </div>
      ) : runs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Wallet className="w-14 h-14 mb-4 opacity-40" />
          <p className="text-lg font-medium text-slate-500">No payroll runs yet</p>
          <p className="text-sm mt-1">Create a payroll run to process employee salaries.</p>
        </div>
      ) : (
        <div className="rounded-[32px] border border-gold/20 bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Period</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Total</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Completed</th>
                <th className="w-28 px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                    {new Date(run.period_month + "T00:00:00").toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${statusColors[run.status]}`}>
                      {run.status === "completed" ? <CheckCircle2 className="w-3 h-3" /> : run.status === "draft" ? <FileText className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {run.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-slate-800">
                    {run.total_amount ? `SAR ${Number(run.total_amount).toLocaleString()}` : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {run.completed_at ? new Date(run.completed_at).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-6 py-4">
                    {run.status === "draft" && (
                      <button
                        onClick={() => handleComplete(run.id)}
                        className="text-forest text-sm font-medium hover:underline"
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
