"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, Play, Loader2, CheckCircle2, Clock, IndianRupee, Search, Download, Mail, BanknoteIcon } from "lucide-react";
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
  payment_date: string | null;
}

export default function RunPayrollPage() {
  const { session, profile } = useAuth();
  const today = todayIST();
  const currentMonth = today.slice(0, 7);

  const [month, setMonth] = useState(currentMonth);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedProcessed, setSelectedProcessed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [paymentDate, setPaymentDate] = useState(today);
  const [searchQuery, setSearchQuery] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

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
      setSelectedProcessed(new Set());
    }
    setLoading(false);
  }, [session, month]);

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

  const pendingEmployees = useMemo(
    () => employees.filter((e) => e.status === "pending" || e.status === "draft"),
    [employees]
  );
  const processedEmployees = useMemo(
    () => employees.filter((e) => e.status === "processed"),
    [employees]
  );
  const paidEmployees = useMemo(
    () => employees.filter((e) => e.status === "paid"),
    [employees]
  );

  const filteredPending = useMemo(() => {
    if (!searchQuery.trim()) return pendingEmployees;
    const q = searchQuery.toLowerCase();
    return pendingEmployees.filter((e) =>
      e.name.toLowerCase().includes(q) || (e.designation && e.designation.toLowerCase().includes(q))
    );
  }, [pendingEmployees, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });
  };
  const toggleSelectProcessed = (id: string) => {
    setSelectedProcessed((prev) => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });
  };

  const handleRunPayroll = async () => {
    if (selected.size === 0) return;
    const confirmed = await showConfirm("Run Payroll", `Process payroll for ${selected.size} employee(s) for ${month}?`);
    if (!confirmed) return;
    setRunning(true);
    const res = await fetch("/api/admin/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
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

  const handleMarkPaid = async () => {
    if (selectedProcessed.size === 0) return;
    if (!paymentDate) { showToast("Set a payment date first", "error"); return; }
    const confirmed = await showConfirm(
      "Mark as Paid",
      `Mark ${selectedProcessed.size} payroll(s) as paid on ${paymentDate}?`
    );
    if (!confirmed) return;
    setMarkingPaid(true);
    const res = await fetch("/api/admin/payroll/mark-paid", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ month, employee_ids: Array.from(selectedProcessed), payment_date: paymentDate }),
    });
    if (res.ok) {
      showToast(`Marked ${selectedProcessed.size} payroll(s) as paid`, "success");
      fetchPayroll();
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to mark as paid", "error");
    }
    setMarkingPaid(false);
  };

  const handleExport = async (statusFilter: "processed" | "paid" | "all") => {
    setExportLoading(true);
    try {
      const res = await fetch(`/api/admin/payroll/export?month=${month}&status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) { showToast("No payroll data to export", "error"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll-${month}.csv`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
      showToast("Payroll CSV downloaded", "success");
    } catch {
      showToast("Export failed", "error");
    }
    setExportLoading(false);
  };

  const handleEmailAccounts = () => {
    const subject = encodeURIComponent(`Payroll Summary - ${month}`);
    const body = encodeURIComponent(
      `Hi,\n\nPlease find the payroll summary for ${month} attached.\n\nTotal processed: ${processedEmployees.length + paidEmployees.length} employees\nTotal net payable: ₹${(processedEmployees.concat(paidEmployees)).reduce((s, e) => s + (e.net_payable || 0), 0).toLocaleString("en-IN")}\n\nRegards,\nHR Team`
    );
    window.open(`mailto:ratul.dey@ultimatesolutions.in?subject=${subject}&body=${body}`, "_blank");
  };

  if (profile && !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-lg font-semibold mb-2">Access Denied</p>
        <p className="text-sm text-gray-500">Only super admins and HR can run payroll.</p>
      </div>
    );
  }

  const totalProcessedNet = [...processedEmployees, ...paidEmployees].reduce((s, e) => s + (e.net_payable || 0), 0);

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
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Pending", value: pendingEmployees.length, color: "text-amber-500" },
            { label: "Processed", value: processedEmployees.length, color: "text-blue-500" },
            { label: "Paid", value: paidEmployees.length, color: "text-green-500" },
            { label: "Total", value: employees.length, color: "text-primary" },
          ].map((c) => (
            <div key={c.label} className="bg-white dark:bg-surface-dark rounded-xl p-3 border border-gray-100 dark:border-gray-700/50 text-center">
              <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
              <p className="text-[10px] text-gray-500">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Total Disbursement + Actions */}
        {totalProcessedNet > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800 space-y-3">
            <div>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Total Disbursement</p>
              <div className="flex items-center gap-1">
                <IndianRupee className="w-5 h-5 text-green-600" />
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {totalProcessedNet.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport("all")}
                disabled={exportLoading}
                className="flex-1 py-2 rounded-xl border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-green-100 dark:hover:bg-green-900/30"
              >
                {exportLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                Export CSV
              </button>
              <button
                onClick={handleEmailAccounts}
                className="flex-1 py-2 rounded-xl border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-green-100 dark:hover:bg-green-900/30"
              >
                <Mail className="w-3 h-3" />
                Email Accounts
              </button>
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
                  <button onClick={() => setSelected(new Set(filteredPending.map((e) => e.id)))} className="text-xs text-primary font-medium">
                    Select All
                  </button>
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm" />
                </div>
                <div className="space-y-2">
                  {filteredPending.map((emp) => (
                    <label key={emp.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${selected.has(emp.id) ? "bg-primary/5 border-primary/30" : "bg-white dark:bg-surface-dark border-gray-100 dark:border-gray-700/50"}`}>
                      <input type="checkbox" checked={selected.has(emp.id)} onChange={() => toggleSelect(emp.id)} className="rounded border-gray-300 text-primary focus:ring-primary/50" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{emp.name}</p>
                        <p className="text-xs text-gray-500 truncate">{emp.designation || "—"} · {emp.project || "—"}</p>
                      </div>
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    </label>
                  ))}
                </div>
                <button onClick={handleRunPayroll} disabled={selected.size === 0 || running}
                  className="w-full mt-4 py-3 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {running ? "Processing..." : `Run Payroll (${selected.size} selected)`}
                </button>
              </div>
            )}

            {/* Processed — can be marked as Paid */}
            {processedEmployees.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
                    Processed ({processedEmployees.length})
                  </p>
                  <button onClick={() => setSelectedProcessed(new Set(processedEmployees.map((e) => e.id)))} className="text-xs text-primary font-medium">
                    Select All
                  </button>
                </div>
                <div className="space-y-2 mb-3">
                  {processedEmployees.map((emp) => (
                    <label key={emp.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${selectedProcessed.has(emp.id) ? "bg-blue-50 dark:bg-blue-900/10 border-blue-300 dark:border-blue-700" : "bg-white dark:bg-surface-dark border-gray-100 dark:border-gray-700/50"}`}>
                      <input type="checkbox" checked={selectedProcessed.has(emp.id)} onChange={() => toggleSelectProcessed(emp.id)} className="rounded border-gray-300 text-primary focus:ring-primary/50" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{emp.name}</p>
                        <p className="text-xs text-gray-500 truncate">{emp.designation || "—"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-primary">₹{(emp.net_payable || 0).toLocaleString("en-IN")}</p>
                        <p className="text-[10px] text-gray-400">Net</p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Payment date + Mark Paid */}
                {selectedProcessed.size > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-200 dark:border-blue-800 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1.5 block">Payment Date</label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-800 text-sm dark:[color-scheme:dark]"
                      />
                    </div>
                    <button onClick={handleMarkPaid} disabled={markingPaid || !paymentDate}
                      className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                      {markingPaid ? <Loader2 className="w-4 h-4 animate-spin" /> : <BanknoteIcon className="w-4 h-4" />}
                      {markingPaid ? "Marking..." : `Mark ${selectedProcessed.size} as Paid`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Paid */}
            {paidEmployees.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                  Paid ({paidEmployees.length})
                </p>
                <div className="space-y-2">
                  {paidEmployees.map((emp) => (
                    <div key={emp.id} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700/50">
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{emp.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {emp.designation || "—"}
                          {emp.payment_date ? ` · Paid ${emp.payment_date}` : ""}
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
