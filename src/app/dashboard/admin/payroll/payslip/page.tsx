"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Download, Loader2, Search, IndianRupee } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { showToast } from "@/components/ui/Toast";
import { todayIST } from "@/lib/utils";

interface PayslipData {
  id: string;
  employee_id: string;
  employee_name: string;
  designation: string;
  department: string;
  project: string;
  employee_code: string;
  date_of_joining: string;
  month: string;
  gross_earnings: number;
  total_deductions: number;
  net_payable: number;
  working_days: number;
  days_present: number;
  days_absent: number;
  lwp_days: number;
  leave_days: number;
  earnings_breakdown: Record<string, number>;
  deductions_breakdown: Record<string, number>;
  status: string;
  processed_at: string | null;
}

interface EmployeeOption {
  id: string;
  full_name: string;
}

export default function PayslipViewPage() {
  const { session, profile } = useAuth();
  const currentMonth = todayIST().slice(0, 7);

  const [month, setMonth] = useState(currentMonth);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [payslip, setPayslip] = useState<PayslipData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const hasAccess = profile?.role === "super_admin" ||
    (profile?.designation?.toLowerCase().includes("hr") &&
      ["admin", "super_admin"].includes(profile?.role || ""));

  // Fetch employees with processed payroll
  useEffect(() => {
    async function fetchEmployees() {
      const { data } = await supabase
        .from("hr_profiles")
        .select("id, full_name")
        .is("deactivated_at", null)
        .order("full_name")
        .limit(500);
      setEmployees(data || []);
    }
    fetchEmployees();
  }, []);

  const fetchPayslip = useCallback(async () => {
    if (!selectedEmployee || !month || !session?.access_token) return;
    setLoading(true);
    setPayslip(null);

    const res = await fetch(
      `/api/admin/payslip?employee_id=${selectedEmployee}&month=${month}`,
      { headers: { Authorization: `Bearer ${session.access_token}` } }
    );

    if (res.ok) {
      const data = await res.json();
      setPayslip(data.payslip);
    } else {
      setPayslip(null);
    }
    setLoading(false);
  }, [selectedEmployee, month, session]);

  useEffect(() => {
    if (selectedEmployee && month) fetchPayslip();
  }, [selectedEmployee, month, fetchPayslip]);

  const filteredEmployees = employees.filter((e) =>
    !searchQuery.trim() || e.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownloadPDF = async () => {
    if (!payslip) return;
    setGenerating(true);

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const w = doc.internal.pageSize.getWidth();
      let y = 20;

      // Company header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("UDS - Ultimate Digital Solutions", w / 2, y, { align: "center" });
      y += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Payslip", w / 2, y, { align: "center" });
      y += 5;

      const monthLabel = new Date(`${payslip.month}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      doc.text(monthLabel, w / 2, y, { align: "center" });
      y += 8;

      // Divider
      doc.setDrawColor(200);
      doc.line(15, y, w - 15, y);
      y += 8;

      // Employee details
      doc.setFontSize(9);
      const leftCol = 15;
      const rightCol = w / 2 + 10;

      const empDetails = [
        ["Employee Name", payslip.employee_name],
        ["Designation", payslip.designation || "—"],
        ["Department", payslip.department || "—"],
        ["Employee Code", payslip.employee_code || "—"],
      ];
      const rightDetails = [
        ["Project", payslip.project || "—"],
        ["Working Days", String(payslip.working_days)],
        ["Days Present", String(payslip.days_present)],
        ["LWP Days", String(payslip.lwp_days)],
      ];

      for (let i = 0; i < Math.max(empDetails.length, rightDetails.length); i++) {
        if (empDetails[i]) {
          doc.setFont("helvetica", "bold");
          doc.text(empDetails[i][0] + ":", leftCol, y);
          doc.setFont("helvetica", "normal");
          doc.text(empDetails[i][1], leftCol + 35, y);
        }
        if (rightDetails[i]) {
          doc.setFont("helvetica", "bold");
          doc.text(rightDetails[i][0] + ":", rightCol, y);
          doc.setFont("helvetica", "normal");
          doc.text(rightDetails[i][1], rightCol + 30, y);
        }
        y += 5;
      }

      y += 5;
      doc.line(15, y, w - 15, y);
      y += 8;

      // Earnings table
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Earnings", leftCol, y);
      doc.text("Deductions", rightCol, y);
      y += 6;

      doc.setFontSize(9);
      const earningEntries = Object.entries(payslip.earnings_breakdown);
      const deductionEntries = Object.entries(payslip.deductions_breakdown);
      const maxRows = Math.max(earningEntries.length, deductionEntries.length);

      for (let i = 0; i < maxRows; i++) {
        if (earningEntries[i]) {
          doc.setFont("helvetica", "normal");
          doc.text(earningEntries[i][0], leftCol, y);
          doc.text(`₹${Number(earningEntries[i][1]).toLocaleString("en-IN")}`, leftCol + 65, y, { align: "right" });
        }
        if (deductionEntries[i]) {
          doc.setFont("helvetica", "normal");
          doc.text(deductionEntries[i][0], rightCol, y);
          doc.text(`₹${Number(deductionEntries[i][1]).toLocaleString("en-IN")}`, rightCol + 65, y, { align: "right" });
        }
        y += 5;
      }

      y += 3;
      doc.line(15, y, w - 15, y);
      y += 6;

      // Totals
      doc.setFont("helvetica", "bold");
      doc.text("Gross Earnings:", leftCol, y);
      doc.text(`₹${payslip.gross_earnings.toLocaleString("en-IN")}`, leftCol + 65, y, { align: "right" });
      doc.text("Total Deductions:", rightCol, y);
      doc.text(`₹${payslip.total_deductions.toLocaleString("en-IN")}`, rightCol + 65, y, { align: "right" });
      y += 8;

      // Net Pay
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Net Payable:", leftCol, y);
      doc.text(`₹${payslip.net_payable.toLocaleString("en-IN")}`, w - 15, y, { align: "right" });
      y += 10;

      doc.setDrawColor(200);
      doc.line(15, y, w - 15, y);
      y += 8;

      // Footer
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150);
      doc.text("This is a system-generated payslip. No signature required.", w / 2, y, { align: "center" });

      doc.save(`payslip-${payslip.employee_name.replace(/\s+/g, "-")}-${payslip.month}.pdf`);
      showToast("Payslip downloaded", "success");
    } catch {
      showToast("Failed to generate PDF", "error");
    }
    setGenerating(false);
  };

  if (profile && !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-lg font-semibold mb-2">Access Denied</p>
        <p className="text-sm text-gray-500">Only super admins and HR can view payslips here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link href="/dashboard/admin/payroll" className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-lg font-semibold text-center flex-1">Payslips</h1>
        <div className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 space-y-4">
        {/* Month + Employee selector */}
        <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm dark:[color-scheme:dark]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Employee</label>
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
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
              size={Math.min(filteredEmployees.length + 1, 5)}
            >
              <option value="">-- Select --</option>
              {filteredEmployees.map((e) => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Payslip */}
        {loading ? (
          <div className="text-center py-8 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading payslip...</p>
          </div>
        ) : payslip ? (
          <div className="space-y-4">
            {/* Employee Card */}
            <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-100 dark:border-gray-700/50">
              <p className="text-lg font-bold">{payslip.employee_name}</p>
              <p className="text-xs text-gray-500">{payslip.designation} · {payslip.department} · {payslip.project}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(`${payslip.month}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                {payslip.employee_code ? ` · Code: ${payslip.employee_code}` : ""}
              </p>
            </div>

            {/* Attendance Summary */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Working", value: payslip.working_days, color: "text-gray-700" },
                { label: "Present", value: payslip.days_present, color: "text-green-600" },
                { label: "Absent", value: payslip.days_absent, color: "text-red-500" },
                { label: "LWP", value: payslip.lwp_days, color: "text-amber-500" },
              ].map((item) => (
                <div key={item.label} className="bg-white dark:bg-surface-dark rounded-xl p-2.5 border border-gray-100 dark:border-gray-700/50 text-center">
                  <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-[10px] text-gray-500">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Earnings */}
            <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
              <div className="px-4 py-3 bg-green-50 dark:bg-green-900/10 border-b border-gray-100 dark:border-gray-700/50">
                <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase">Earnings</p>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {Object.entries(payslip.earnings_breakdown).map(([name, amount]) => (
                  <div key={name} className="flex justify-between px-4 py-2.5">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{name}</span>
                    <span className="text-sm font-medium">₹{Number(amount).toLocaleString("en-IN")}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-3 bg-green-50/50 dark:bg-green-900/5">
                  <span className="text-sm font-semibold text-green-700 dark:text-green-400">Gross Earnings</span>
                  <span className="text-sm font-bold text-green-700 dark:text-green-400">₹{payslip.gross_earnings.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
              <div className="px-4 py-3 bg-red-50 dark:bg-red-900/10 border-b border-gray-100 dark:border-gray-700/50">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase">Deductions</p>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {Object.entries(payslip.deductions_breakdown).map(([name, amount]) => (
                  <div key={name} className="flex justify-between px-4 py-2.5">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{name}</span>
                    <span className="text-sm font-medium text-red-600">-₹{Number(amount).toLocaleString("en-IN")}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-3 bg-red-50/50 dark:bg-red-900/5">
                  <span className="text-sm font-semibold text-red-700 dark:text-red-400">Total Deductions</span>
                  <span className="text-sm font-bold text-red-700 dark:text-red-400">₹{payslip.total_deductions.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Net Pay */}
            <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-xl p-5 border border-primary/20 text-center">
              <p className="text-xs text-gray-500 mb-1">Net Payable</p>
              <div className="flex items-center justify-center gap-1">
                <IndianRupee className="w-6 h-6 text-primary" />
                <p className="text-3xl font-bold text-primary">{payslip.net_payable.toLocaleString("en-IN")}</p>
              </div>
            </div>

            {/* Download PDF */}
            <button
              onClick={handleDownloadPDF}
              disabled={generating}
              className="w-full py-3 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {generating ? "Generating PDF..." : "Download Payslip PDF"}
            </button>
          </div>
        ) : selectedEmployee && !loading ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No payslip found for this employee/month.</p>
            <p className="text-xs mt-1">Run payroll first.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
