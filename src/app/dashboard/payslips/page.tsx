"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Download, Loader2, IndianRupee, FileText } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { showToast } from "@/components/ui/Toast";
import type { HrPayroll } from "@/lib/database.types";

export default function MyPayslipsPage() {
  const { user, profile, session } = useAuth();
  const [payslips, setPayslips] = useState<HrPayroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState<HrPayroll | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function fetchPayslips() {
      if (!user) return;
      const { data } = await supabase
        .from("hr_payroll")
        .select("*")
        .eq("employee_id", user.id)
        .in("status", ["processed", "paid"])
        .order("month", { ascending: false })
        .limit(24);
      setPayslips((data as HrPayroll[]) || []);
      setLoading(false);
    }
    fetchPayslips();
  }, [user]);

  const handleDownloadPDF = useCallback(async (payroll: HrPayroll) => {
    if (!session?.access_token) return;
    setGenerating(true);
    try {
      // Fetch enhanced payslip data (UAN, PAN masked, bank) and company settings in parallel
      const [payslipRes, settingsRes] = await Promise.all([
        fetch(`/api/admin/payslip?payroll_id=${payroll.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch("/api/admin/company-settings", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ]);

      const enhanced = payslipRes.ok ? (await payslipRes.json()).payslip : {};
      const company = settingsRes.ok ? (await settingsRes.json()).settings : {};

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
      if (logoBase64) doc.addImage(logoBase64, "JPEG", L, y, logoW, logoH);
      const hx = L + (logoBase64 ? logoW + 4 : 0);
      const companyName = company.company_full_name || "Ultimate Digital Solutions";
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(companyName, hx, y + 5);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      if (company.company_address) {
        const addrLines = doc.splitTextToSize(company.company_address, w - hx - 15);
        doc.text(addrLines, hx, y + 11);
      }
      const regTexts: string[] = [];
      if (company.company_pf_no) regTexts.push(`PF: ${company.company_pf_no}`);
      if (company.company_esic_code) regTexts.push(`ESIC: ${company.company_esic_code}`);
      if (regTexts.length) doc.text(regTexts.join("   "), hx, y + 19);
      y += logoH + 5;

      // Title
      const monthLabel = new Date(`${payroll.month}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
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

      // Employee details
      doc.setFontSize(8.5);
      const empLeft = [
        ["Name", profile?.full_name || "—"],
        ["Designation", profile?.designation || "—"],
        ["Employee Code", enhanced.employee_code || "—"],
        ["UAN", enhanced.uan_number || "—"],
        ["PAN", enhanced.pan_masked || "—"],
      ];
      const empRight = [
        ["Working Days", String(payroll.working_days)],
        ["Days Present", String(payroll.days_present)],
        ["Days Absent", String(payroll.days_absent)],
        ["LWP Days", String(payroll.lwp_days)],
        ["Bank", enhanced.bank_name || "—"],
      ];
      for (let i = 0; i < Math.max(empLeft.length, empRight.length); i++) {
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

      // Earnings & Deductions
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
      const earningEntries = Object.entries(payroll.earnings_breakdown);
      const deductionEntries = Object.entries(payroll.deductions_breakdown);
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
      doc.text(`Rs.${payroll.gross_earnings.toLocaleString("en-IN")}`, colMid - 2, y, { align: "right" });
      doc.text("Total Deductions:", colMid + 4, y);
      doc.text(`Rs.${payroll.total_deductions.toLocaleString("en-IN")}`, w - L, y, { align: "right" });
      y += 8;

      // Net payable
      doc.setFontSize(11);
      doc.setFillColor(19, 127, 236);
      doc.roundedRect(L, y - 5, w - 2 * L, 10, 2, 2, "F");
      doc.setTextColor(255);
      doc.text("NET PAYABLE", L + 4, y + 1);
      doc.text(`Rs.${payroll.net_payable.toLocaleString("en-IN")}`, w - L - 2, y + 1, { align: "right" });
      doc.setTextColor(0);
      y += 14;

      // Employer contributions
      const ePF = Number(enhanced.employer_pf || 0);
      const eESI = Number(enhanced.employer_esi || 0);
      if (ePF > 0 || eESI > 0) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("Employer Contributions (not deducted from salary):", L, y);
        y += 4.5;
        doc.setFont("helvetica", "normal");
        if (ePF > 0) doc.text(`Employer PF: Rs.${ePF.toLocaleString("en-IN")}`, L, y);
        if (eESI > 0) doc.text(`Employer ESI: Rs.${eESI.toLocaleString("en-IN")}`, L + 55, y);
        y += 7;
      }

      doc.line(L, y, w - L, y);
      y += 5;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150);
      doc.text("This is a system-generated payslip and does not require a signature.", w / 2, y, { align: "center" });

      doc.save(`payslip-${payroll.month}.pdf`);
      showToast("Payslip downloaded", "success");
    } catch {
      showToast("Failed to generate PDF", "error");
    }
    setGenerating(false);
  }, [profile, session]);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link href="/dashboard/profile" className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-lg font-semibold text-center flex-1">My Payslips</h1>
        <div className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading...</p>
          </div>
        ) : payslips.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No payslips available yet</p>
          </div>
        ) : selectedPayslip ? (
          /* Detail View */
          <div className="space-y-4">
            <button onClick={() => setSelectedPayslip(null)} className="text-xs text-primary font-medium">&larr; Back to list</button>

            <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-100 dark:border-gray-700/50">
              <p className="text-lg font-bold">
                {new Date(`${selectedPayslip.month}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Working", value: selectedPayslip.working_days },
                { label: "Present", value: selectedPayslip.days_present },
                { label: "Absent", value: selectedPayslip.days_absent },
                { label: "LWP", value: selectedPayslip.lwp_days },
              ].map((item) => (
                <div key={item.label} className="bg-white dark:bg-surface-dark rounded-xl p-2.5 border border-gray-100 dark:border-gray-700/50 text-center">
                  <p className="text-lg font-bold">{item.value}</p>
                  <p className="text-[10px] text-gray-500">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Earnings */}
            <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
              <div className="px-4 py-2.5 bg-green-50 dark:bg-green-900/10"><p className="text-xs font-semibold text-green-700 dark:text-green-400">EARNINGS</p></div>
              {Object.entries(selectedPayslip.earnings_breakdown).map(([name, amt]) => (
                <div key={name} className="flex justify-between px-4 py-2 border-t border-gray-100 dark:border-gray-700/50">
                  <span className="text-sm">{name}</span>
                  <span className="text-sm font-medium">₹{Number(amt).toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>

            {/* Deductions */}
            <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
              <div className="px-4 py-2.5 bg-red-50 dark:bg-red-900/10"><p className="text-xs font-semibold text-red-700 dark:text-red-400">DEDUCTIONS</p></div>
              {Object.entries(selectedPayslip.deductions_breakdown).map(([name, amt]) => (
                <div key={name} className="flex justify-between px-4 py-2 border-t border-gray-100 dark:border-gray-700/50">
                  <span className="text-sm">{name}</span>
                  <span className="text-sm font-medium text-red-600">-₹{Number(amt).toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>

            {/* Net */}
            <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-xl p-4 border border-primary/20 text-center">
              <p className="text-xs text-gray-500 mb-1">Net Payable</p>
              <div className="flex items-center justify-center gap-1">
                <IndianRupee className="w-5 h-5 text-primary" />
                <p className="text-2xl font-bold text-primary">{selectedPayslip.net_payable.toLocaleString("en-IN")}</p>
              </div>
            </div>

            <button
              onClick={() => handleDownloadPDF(selectedPayslip)}
              disabled={generating}
              className="w-full py-3 rounded-xl bg-primary text-white font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download PDF
            </button>
          </div>
        ) : (
          /* List View */
          payslips.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPayslip(p)}
              className="w-full flex items-center justify-between p-4 bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <div>
                <p className="text-sm font-semibold">
                  {new Date(`${p.month}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                </p>
                <p className="text-xs text-gray-500">
                  Gross: ₹{p.gross_earnings.toLocaleString("en-IN")} · Deductions: ₹{p.total_deductions.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">₹{p.net_payable.toLocaleString("en-IN")}</p>
                <p className="text-[10px] text-gray-400">Net Pay</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
