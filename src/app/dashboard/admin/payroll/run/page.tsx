"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, Play, Loader2, CheckCircle2, Clock, IndianRupee, Search } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { showToast } from "@/components/ui/Toast";
import { showConfirm } from "@/components/ui/Dialog";
import { todayIST } from "@/lib/utils";

interface PayrollEmployee {
  id: string;
  name: string;
  designation: string | null;
  project: string | null;
  department: string | null;
  status: "pending" | "draft" | "processed" | "paid";
  net_payable: number | null;
  gross: number | null;
  deductions: number | null;
}

export default function RunPayrollPage() {
  const { session, profile } = useAuth();
  const today = todayIST();
  const currentMonth = today.slice(0, 7);

  const [month, setMonth] = useState(currentMonth);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const hasAccess = profile?.role === "super_admin" ||
    (profile?.designation?.toLowerCase().includes("hr") &&
      ["admin", "super_admin"].includes(profile?.role || ""));

  const fetchPayroll = useCallback(async () => {
    if (!session?.access_token || !month) return;
    setLoading(true);
    const res = await fetch(`/api/admin/payroll?month=${month}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setEmployees(data.employees || []);
      setSelected(new Set());
    }
    setLoading(false);
  }, [session, month]);

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  const pendingEmployees = useMemo(
    () => employees.filter((e) => e.status === "pending" || e.status === "draft"),
    [employees]
  );
  const processedEmployees = useMemo(
    () => employees.filter((e) => e.status === "processed" || e.status === "paid"),
    [employees]
  );

  const filteredPending = useMemo(() => {
    if (!searchQuery.trim()) return pendingEmployees;
    const q = searchQuery.toLowerCase();
    return pendingEmployees.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      (e.designation && e.designation.toLowerCase().includes(q))
    );
  }, [pendingEmployees, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllPending = () => {
    setSelected(new Set(filteredPending.map((e) => e.id)));
  };

  const handleRunPayroll = async () => {
    if (selected.size === 0) return;
    const confirmed = await showConfirm(
      "Run Payroll",
      `Process payroll for ${selected.size} employee(s) for ${month}?`
    );
    if (!confirmed) return;

    setRunning(true);
    const res = await fetch("/api/admin/payroll", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ month, employee_ids: Array.from(selected) }),
    });

    if (res.ok) {
      const data = await res.json();
      showToast(`Payroll processed for ${data.processed} employee(s)`, "success");
      fetchPayroll();
    } else {
      const data = await res.json();
      showToast(data.error || "Payroll processing failed", "error");
    }
    setRunning(false);
  };

  if (profile && !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-lg font-semibold mb-2">Access Denied</p>
        <p className="text-sm text-gray-500">Only super admins and HR can run payroll.</p>
      </div>
    );
  }

  const totalProcessedNet = processedEmployees.reduce((sum, e) => sum + (e.net_payable || 0), 0);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link href="/dashboard/admin/payroll" className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-lg font-semibold text-center flex-1">Run Payroll</h1>
        <div className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 space-y-4">
        {/* Month Selector */}
        <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-100 dark:border-gray-700/50">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Payroll Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            max={currentMonth}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm dark:[color-scheme:dark]"
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-surface-dark rounded-xl p-3 border border-gray-100 dark:border-gray-700/50 text-center">
            <p className="text-lg font-bold text-amber-500">{pendingEmployees.length}</p>
            <p className="text-[11px] text-gray-500">Pending</p>
          </div>
          <div className="bg-white dark:bg-surface-dark rounded-xl p-3 border border-gray-100 dark:border-gray-700/50 text-center">
            <p className="text-lg font-bold text-green-500">{processedEmployees.length}</p>
            <p className="text-[11px] text-gray-500">Processed</p>
          </div>
          <div className="bg-white dark:bg-surface-dark rounded-xl p-3 border border-gray-100 dark:border-gray-700/50 text-center">
            <p className="text-lg font-bold text-primary">{employees.length}</p>
            <p className="text-[11px] text-gray-500">Total</p>
          </div>
        </div>

        {/* Total Disbursement */}
        {totalProcessedNet > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
            <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Total Processed</p>
            <div className="flex items-center gap-1">
              <IndianRupee className="w-5 h-5 text-green-600" />
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {totalProcessedNet.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading...</p>
          </div>
        ) : (
          <>
            {/* Pending Section */}
            {pendingEmployees.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
                    Pending ({pendingEmployees.length})
                  </p>
                  <button
                    onClick={selectAllPending}
                    className="text-xs text-primary font-medium hover:text-primary/80"
                  >
                    Select All
                  </button>
                </div>

                {/* Search */}
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  {filteredPending.map((emp) => (
                    <label
                      key={emp.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                        selected.has(emp.id)
                          ? "bg-primary/5 border-primary/30"
                          : "bg-white dark:bg-surface-dark border-gray-100 dark:border-gray-700/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(emp.id)}
                        onChange={() => toggleSelect(emp.id)}
                        className="rounded border-gray-300 text-primary focus:ring-primary/50"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{emp.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {emp.designation || "—"} · {emp.project || "—"}
                        </p>
                      </div>
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    </label>
                  ))}
                </div>

                {/* Run Payroll Button */}
                <button
                  onClick={handleRunPayroll}
                  disabled={selected.size === 0 || running}
                  className="w-full mt-4 py-3 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {running ? "Processing..." : `Run Payroll (${selected.size} selected)`}
                </button>
              </div>
            )}

            {/* Processed Section */}
            {processedEmployees.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                  Processed ({processedEmployees.length})
                </p>
                <div className="space-y-2">
                  {processedEmployees.map((emp) => (
                    <div
                      key={emp.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700/50"
                    >
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{emp.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {emp.designation || "—"} · {emp.project || "—"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-green-600">₹{(emp.net_payable || 0).toLocaleString("en-IN")}</p>
                        <p className="text-[10px] text-gray-400">Net</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {employees.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm">No employees with salary setup found.</p>
                <Link href="/dashboard/admin/payroll/salary" className="text-primary text-sm font-medium mt-2 inline-block">
                  Set up salaries first →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
