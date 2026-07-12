"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Users, Building2, CalendarCheck, Wallet, ShieldAlert, ShieldCheck, ArrowRight } from "lucide-react";

interface SaudiMetrics {
  employees: number;
  departments: number;
  pendingLeave: number;
  activePayroll: number;
  expiringDocuments: number;
}

export default function SaudiDashboardPage() {
  const [metrics, setMetrics] = useState<SaudiMetrics>({
    employees: 0,
    departments: 0,
    pendingLeave: 0,
    activePayroll: 0,
    expiringDocuments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      const [empRes, deptRes, leaveRes, payrollRes, docRes] = await Promise.all([
        supabase.from("saudi_employees").select("id", { count: "exact", head: true }).eq("employment_status", "active"),
        supabase.from("saudi_departments").select("id", { count: "exact", head: true }),
        supabase.from("saudi_leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("saudi_payroll_runs").select("id", { count: "exact", head: true }).neq("status", "completed"),
        supabase.from("saudi_documents").select("id", { count: "exact", head: true }).not("expiry_date", "is", null),
      ]);

      setMetrics({
        employees: empRes.count ?? 0,
        departments: deptRes.count ?? 0,
        pendingLeave: leaveRes.count ?? 0,
        activePayroll: payrollRes.count ?? 0,
        expiringDocuments: docRes.count ?? 0,
      });
      setLoading(false);
    }

    loadMetrics();
  }, []);

  const cards = [
    { label: "Active Employees", value: metrics.employees, icon: Users, href: "/dashboard/saudi/employees", color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
    { label: "Departments", value: metrics.departments, icon: Building2, href: "/dashboard/saudi/departments", color: "text-green-600 bg-green-100 dark:bg-green-900/30" },
    { label: "Pending Leave", value: metrics.pendingLeave, icon: CalendarCheck, href: "/dashboard/saudi/leave", color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30" },
    { label: "Active Payroll", value: metrics.activePayroll, icon: Wallet, href: "/dashboard/saudi/payroll", color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Saudi HR Module</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Saudi compliance, payroll, and workforce management</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="block p-4 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-surface-dark hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-gray-100">
              {loading ? "-" : card.value}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-surface-dark">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Quick Actions</h2>
          <div className="space-y-2">
            <Link href="/dashboard/saudi/employees/new" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Add New Employee</span>
            </Link>
            <Link href="/dashboard/saudi/payroll" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Run Payroll</span>
            </Link>
            <Link href="/dashboard/saudi/leave" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <CalendarCheck className="w-4 h-4 text-primary" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Approve Leave Requests</span>
            </Link>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-surface-dark">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Compliance Alerts</h2>
          {metrics.expiringDocuments > 0 ? (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {metrics.expiringDocuments} documents need attention
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  IQAMA, passport, and work permit expiry tracking
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-700 dark:text-green-300">No compliance issues detected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
