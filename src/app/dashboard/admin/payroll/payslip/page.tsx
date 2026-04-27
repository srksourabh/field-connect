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
  tds_amount: number;
  tds_regime: string | null;
  employer_pf: number;
  employer_esi: number;
  payment_date: string | null;
  uan_number: string;
  pan_masked: string;
  bank_name: string;
  account_masked: string;
  ifsc: string;
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
  const [companySettings, setCompanySettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const hasAccess = profile?.role === "super_admin" ||
    (profile?.designation?.toLowerCase().includes("hr") &&
      ["admin", "super_admin"].includes(profile?.role || ""));

  useEffect(() => {
    async function fetchCompany() {
      if (!session?.access_token) return;
      const res = await fetch("/api/admin/company-settings", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setCompanySettings(d.settings || {});
      }
    }
    fetchCompany();
  }, [session]);

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
      const L = 15;
      const R = w / 2 + 5;
      let y = 15;

      // Load logo
      let logoBase64 = "";
      try {
        const imgRes = await fetch("/brands/uds-logo.jpg");
        const blob = await imgRes.blob();
        logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch { /* logo optional */ }

      // Company header
      const logoW = 18;
      const logoH = 18;
      if (logoBase64) {
        doc.addImage(logoBase64, "JPEG", L, y, logoW, logoH);
      }
      const hx = L + (logoBase64 ? logoW + 4 : 0);
      const companyName = companySettings.company_full_name || "Ultimate Digital Solutions";
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(companyName, hx, y + 5);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      if (companySettings.company_address) {
        const addrLines = doc.splitTextToSize(companySettings.company_address, w - hx - 15);
        doc.text(addrLines, hx, y + 11);
      }
      const regTexts: string[] = [];
      if (companySettings.company_pf_no) regTexts.push(`PF: ${companySettings.company_pf_no}`);
      if (companySettings.company_esic_code) regTexts.push(`ESIC: ${companySettings.company_esic_code}`);
      if (regTexts.length) doc.text(regTexts.join("   "), hx, y + 19);

      y += logoH + 5;

      // Payslip title
      const monthLabel = new Date(`${payslip.month}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(19, 127, 236);
      doc.text(`PAYSLIP — ${monthLabel.toUpperCase()}`, w / 2, y, { align: "center" });
      doc.setTextColor(0);
      y += 6;

      doc.setDrawColor(19, 127, 236);
      doc.setLineWidth(0.5);
      doc.line(L, y, w - L, y);
      doc.setLineWidth(0.2);
      doc.setDrawColor(200);
      y += 6;

      // Employee details — left column
      doc.setFontSize(8.5);
      const empLeft = [
        ["Name", payslip.employee_name],
        ["Designation", payslip.designation || "—"],
        ["Department", payslip.department || "—"],
        ["Employee Code", payslip.employee_code || "—"],
        ["Date of Joining", payslip.date_of_joining || "—"],
        ["UAN", payslip.uan_number || "—"],
        ["PAN", payslip.pan_masked || "—"],
      ];
      const empRight = [
        ["Project", payslip.project || "—"],
        ["Working Days", String(payslip.working_days)],
        ["Days Present", String(payslip.days_present)],
        ["Days Absent", String(payslip.days_absent)],
        ["LWP Days", String(payslip.lwp_days)],
        ["Bank", payslip.bank_name || "—"],
        ["Account", payslip.account_masked || "—"],
      ];
      const detailRows = Math.max(empLeft.length, empRight.length);
      for (let i = 0; i < detailRows; i++) {
        if (empLeft[i]) {
          doc.setFont("helvetica", "bold");
          doc.text(`${empLeft[i][0]}:`, L, y);
          doc.setFont("helvetica", "normal");
          doc.text(empLeft[i][1], L + 28, y);
        }
        if (empRight[i]) {
          doc.setFont("helvetica", "bold");
          doc.text(`${empRight[i][0]}:`, R, y);
          doc.setFont("helvetica", "normal");
          doc.text(empRight[i][1], R + 26, y);
        }
        y += 5;
      }
      y += 3;
      doc.line(L, y, w - L, y);
      y += 6;

      // Earnings & Deductions header
      const colMid = w / 2;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(240, 248, 255);
      doc.rect(L, y - 4, colMid - L - 2, 8, "F");
      doc.rect(colMid + 2, y - 4, w - colMid - L - 2, 8, "F");
      doc.text("EARNINGS", L + 2, y);
      doc.text("DEDUCTIONS", colMid + 4, y);
      y += 5;

      doc.setFontSize(8.5);
      const earningEntries = Object.entries(payslip.earnings_breakdown);
      const deductionEntries = Object.entries(payslip.deductions_breakdown);
      const maxRows = Math.max(earningEntries.length, deductionEntries.length);

      for (let i = 0; i < maxRows; i++) {
        doc.setFont("helvetica", "normal");
        if (earningEntries[i]) {
          doc.text(earningEntries[i][0], L + 2, y);
          doc.text(`Rs.${Number(earningEntries[i][1]).toLocaleString("en-IN")}`, colMid - 2, y, { align: "right" });
        }
        if (deductionEntries[i]) {
          doc.text(deductionEntries[i][0], colMid + 4, y);
          doc.text(`Rs.${Number(deductionEntries[i][1]).toLocaleString("en-IN")}`, w - L, y, { align: "right" });
        }
        y += 5;
      }

      y += 2;
      doc.line(L, y, w - L, y);
      y += 5;

      doc.setFont("helvetica", "bold");
      doc.text("Gross Earnings:", L + 2, y);
      doc.text(`Rs.${payslip.gross_earnings.toLocaleString("en-IN")}`, colMid - 2, y, { align: "right" });
      doc.text("Total Deductions:", colMid + 4, y);
      doc.text(`Rs.${payslip.total_deductions.toLocaleString("en-IN")}`, w - L, y, { align: "right" });
      y += 8;

      // Net payable
      doc.setFontSize(11);
      doc.setFillColor(19, 127, 236);
      doc.roundedRect(L, y - 5, w - 2 * L, 10, 2, 2, "F");
      doc.setTextColor(255);
      doc.text("NET PAYABLE", L + 4, y + 1);
      doc.text(`Rs.${payslip.net_payable.toLocaleString("en-IN")}`, w - L - 2, y + 1, { align: "right" });
      doc.setTextColor(0);
      y += 14;

      // Employer contributions (informational)
      if ((payslip.employer_pf || 0) > 0 || (payslip.employer_esi || 0) > 0) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("Employer Contributions (not deducted from salary):", L, y);
        y += 4.5;
        doc.setFont("helvetica", "normal");
        if (payslip.employer_pf) doc.text(`Employer PF: Rs.${Number(payslip.employer_pf).toLocaleString("en-IN")}`, L, y);
        if (payslip.employer_esi) doc.text(`Employer ESI: Rs.${Number(payslip.employer_esi).toLocaleString("en-IN")}`, L + 55, y);
        if (payslip.ifsc) doc.text(`IFSC: ${payslip.ifsc}`, R + 20, y);
        y += 8;
      }

      doc.line(L, y, w - L, y);
      y += 5;

      // Footer
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150);
      doc.text("This is a system-generated payslip and does not require a signature.", w / 2, y, { align: "center" });

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

            {/* Employer Contributions */}
            {((payslip.employer_pf || 0) > 0 || (payslip.employer_esi || 0) > 0) && (
              <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                <div className="px-4 py-2.5 bg-blue-50 dark:bg-blue-900/10 border-b border-gray-100 dark:border-gray-700/50">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase">Employer Contributions (informational)</p>
                </div>
                {(payslip.employer_pf || 0) > 0 && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Employer PF</span>
                    <span className="text-sm font-medium text-blue-600">₹{Number(payslip.employer_pf).toLocaleString("en-IN")}</span>
                  </div>
                )}
                {(payslip.employer_esi || 0) > 0 && (
                  <div className="flex justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-700/50">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Employer ESI</span>
                    <span className="text-sm font-medium text-blue-600">₹{Number(payslip.employer_esi).toLocaleString("en-IN")}</span>
                  </div>
                )}
              </div>
            )}

            {/* Bank & PAN info */}
            {(payslip.bank_name || payslip.uan_number || payslip.pan_masked) && (
              <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 space-y-1.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bank & KYC Info</p>
                {payslip.bank_name && <div className="flex justify-between text-sm"><span className="text-gray-500">Bank</span><span className="font-medium">{payslip.bank_name}</span></div>}
                {payslip.account_masked && <div className="flex justify-between text-sm"><span className="text-gray-500">Account</span><span className="font-medium font-mono">{payslip.account_masked}</span></div>}
                {payslip.ifsc && <div className="flex justify-between text-sm"><span className="text-gray-500">IFSC</span><span className="font-medium font-mono">{payslip.ifsc}</span></div>}
                {payslip.uan_number && <div className="flex justify-between text-sm"><span className="text-gray-500">UAN</span><span className="font-medium font-mono">{payslip.uan_number}</span></div>}
                {payslip.pan_masked && <div className="flex justify-between text-sm"><span className="text-gray-500">PAN</span><span className="font-medium font-mono">{payslip.pan_masked}</span></div>}
              </div>
            )}

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
