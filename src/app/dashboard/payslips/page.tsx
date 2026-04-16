"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Download, Loader2, IndianRupee, FileText } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { showToast } from "@/components/ui/Toast";
import type { HrPayroll } from "@/lib/database.types";

export default function MyPayslipsPage() {
  const { user, profile } = useAuth();
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
    setGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const w = doc.internal.pageSize.getWidth();
      let y = 20;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("UDS - Ultimate Digital Solutions", w / 2, y, { align: "center" });
      y += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Payslip", w / 2, y, { align: "center" });
      y += 5;
      const monthLabel = new Date(`${payroll.month}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      doc.text(monthLabel, w / 2, y, { align: "center" });
      y += 8;
      doc.setDrawColor(200);
      doc.line(15, y, w - 15, y);
      y += 8;

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Employee:", 15, y);
      doc.setFont("helvetica", "normal");
      doc.text(profile?.full_name || "—", 50, y);
      doc.setFont("helvetica", "bold");
      doc.text("Working Days:", w / 2 + 10, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(payroll.working_days), w / 2 + 45, y);
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.text("Designation:", 15, y);
      doc.setFont("helvetica", "normal");
      doc.text(profile?.designation || "—", 50, y);
      doc.setFont("helvetica", "bold");
      doc.text("Days Present:", w / 2 + 10, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(payroll.days_present), w / 2 + 45, y);
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.text("LWP Days:", 15, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(payroll.lwp_days), 50, y);
      y += 8;
      doc.line(15, y, w - 15, y);
      y += 8;

      // Earnings & Deductions
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Earnings", 15, y);
      doc.text("Deductions", w / 2 + 10, y);
      y += 6;
      doc.setFontSize(9);

      const earnings = Object.entries(payroll.earnings_breakdown);
      const deductions = Object.entries(payroll.deductions_breakdown);
      const maxRows = Math.max(earnings.length, deductions.length);

      for (let i = 0; i < maxRows; i++) {
        if (earnings[i]) {
          doc.setFont("helvetica", "normal");
          doc.text(earnings[i][0], 15, y);
          doc.text(`Rs.${Number(earnings[i][1]).toLocaleString("en-IN")}`, 80, y, { align: "right" });
        }
        if (deductions[i]) {
          doc.setFont("helvetica", "normal");
          doc.text(deductions[i][0], w / 2 + 10, y);
          doc.text(`Rs.${Number(deductions[i][1]).toLocaleString("en-IN")}`, w - 15, y, { align: "right" });
        }
        y += 5;
      }
      y += 3;
      doc.line(15, y, w - 15, y);
      y += 6;

      doc.setFont("helvetica", "bold");
      doc.text("Gross:", 15, y);
      doc.text(`Rs.${payroll.gross_earnings.toLocaleString("en-IN")}`, 80, y, { align: "right" });
      doc.text("Deductions:", w / 2 + 10, y);
      doc.text(`Rs.${payroll.total_deductions.toLocaleString("en-IN")}`, w - 15, y, { align: "right" });
      y += 8;

      doc.setFontSize(12);
      doc.text("Net Payable:", 15, y);
      doc.text(`Rs.${payroll.net_payable.toLocaleString("en-IN")}`, w - 15, y, { align: "right" });
      y += 10;
      doc.line(15, y, w - 15, y);
      y += 8;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150);
      doc.text("This is a system-generated payslip.", w / 2, y, { align: "center" });

      doc.save(`payslip-${payroll.month}.pdf`);
      showToast("Payslip downloaded", "success");
    } catch {
      showToast("Failed to generate PDF", "error");
    }
    setGenerating(false);
  }, [profile]);

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
