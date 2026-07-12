"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Users,
  Building2,
  CalendarCheck,
  Wallet,
  ShieldCheck,
  Briefcase,
  ArrowRight,
  UserCheck,
} from "lucide-react";

interface SaudiMetrics {
  totalEmployees: number;
  activeEmployees: number;
  departments: number;
  pendingLeave: number;
  activePayroll: number;
  expiringDocs: number;
  saudiCount: number;
  expatCount: number;
}

export default function SaudiDashboardPage() {
  const [metrics, setMetrics] = useState<SaudiMetrics>({
    totalEmployees: 0,
    activeEmployees: 0,
    departments: 0,
    pendingLeave: 0,
    activePayroll: 0,
    expiringDocs: 0,
    saudiCount: 0,
    expatCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      const all = supabase.from("saudi_employees").select("id", { count: "exact", head: true });
      const active = supabase.from("saudi_employees").select("id", { count: "exact", head: true }).eq("employment_status", "active");
      const depts = supabase.from("saudi_departments").select("id", { count: "exact", head: true });
      const leave = supabase.from("saudi_leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending");
      const payroll = supabase.from("saudi_payroll_runs").select("id", { count: "exact", head: true }).neq("status", "completed");
      const docs = supabase.from("saudi_documents").select("id", { count: "exact", head: true }).not("expiry_date", "is", null);
      const saudi = supabase.from("saudi_employees").select("id", { count: "exact", head: true }).eq("nationality", "saudi");
      const expat = supabase.from("saudi_employees").select("id", { count: "exact", head: true }).eq("nationality", "expat");

      const [allR, actR, dR, lR, pR, docR, sR, eR] = await Promise.all([all, active, depts, leave, payroll, docs, saudi, expat]);

      setMetrics({
        totalEmployees: allR.count ?? 0,
        activeEmployees: actR.count ?? 0,
        departments: dR.count ?? 0,
        pendingLeave: lR.count ?? 0,
        activePayroll: pR.count ?? 0,
        expiringDocs: docR.count ?? 0,
        saudiCount: sR.count ?? 0,
        expatCount: eR.count ?? 0,
      });
      setLoading(false);
    }
    loadMetrics();
  }, []);

  const kpis = [
    { label: "Total Employees", value: metrics.totalEmployees, icon: Briefcase, bg: "bg-[#fdf8f3]", color: "text-[#0288d1]" },
    { label: "Active Employees", value: metrics.activeEmployees, icon: UserCheck, bg: "bg-[#f0f5f2]", color: "text-forest" },
    { label: "Pending Leave", value: metrics.pendingLeave, icon: CalendarCheck, bg: "bg-[#fff8e7]", color: "text-gold" },
    { label: "Departments", value: metrics.departments, icon: Building2, bg: "bg-[#fdf8f3]", color: "text-[#0288d1]" },
  ];

  const saudization = metrics.totalEmployees > 0
    ? Math.round((metrics.saudiCount / metrics.totalEmployees) * 100)
    : 0;

  return (
    <div className="space-y-10">
      {/* Welcome */}
      <h1 className="text-4xl font-bold text-[#1a1f26] font-satoshi">
        Good morning, Leyo!
      </h1>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-white p-6 rounded-[32px] flex items-center gap-6 shadow-sm border border-gold/20"
            >
              <div className={`kpi-circle ${kpi.bg}`}>
                <Icon className={`${kpi.color} text-2xl`} />
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-800">
                  {loading ? "-" : kpi.value}
                </div>
                <div className="text-slate-400 text-sm">{kpi.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mid Section */}
      <div className="grid grid-cols-12 gap-8">
        {/* Payroll Summary */}
        <div className="col-span-8 bg-white rounded-[32px] p-8 shadow-sm border border-gold/20">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-slate-800">Payroll Summary</h2>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-6 bg-gold rounded-full" />
                <span className="text-slate-400 text-sm">Total Paid</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-6 bg-forest rounded-full" />
                <span className="text-slate-400 text-sm">Active Runs</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-6 bg-amber-300 rounded-full" />
                <span className="text-slate-400 text-sm">Pending</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month, i) => (
              <div key={month} className="space-y-2">
                <div className="chart-grid-tile bg-sky-100" style={{ height: `${32 + i * 8}px` }} />
                <div className="chart-grid-tile bg-forest/20" style={{ height: `${20 + i * 6}px` }} />
                <div className="chart-grid-tile bg-gold/30" style={{ height: `${12 + i * 4}px` }} />
                <p className="text-center text-xs text-slate-400 mt-2 font-medium">{month}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance Status */}
        <div className="col-span-4 bg-white rounded-[32px] p-8 shadow-sm border border-gold/20">
          <h2 className="text-xl font-bold text-slate-800 mb-8">Compliance Status</h2>

          <div className="space-y-10">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                  {metrics.expiringDocs === 0 ? 0 : metrics.expiringDocs}
                </span>
                <span className="text-lg font-medium text-slate-700">Expiring Docs</span>
              </div>
              <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden">
                <div
                  className="h-full progress-bar-gold"
                  style={{ width: `${Math.min(metrics.expiringDocs * 10, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-4 mb-4">
                <span className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center font-bold text-orange-600">
                  {metrics.activePayroll}
                </span>
                <span className="text-lg font-medium text-slate-700">Active Payrolls</span>
              </div>
              <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden">
                <div
                  className="h-full progress-bar-sage"
                  style={{ width: `${Math.min(metrics.activePayroll * 20, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-12 gap-8">
        {/* Recent Activity */}
        <div className="col-span-8 bg-white rounded-[32px] p-8 shadow-sm border border-gold/20">
          <h2 className="text-xl font-bold text-slate-800 mb-8">Quick Actions</h2>

          <div className="flex flex-col gap-3">
            <Link
              href="/dashboard/saudi/employees/new"
              className="bg-slate-50/50 p-6 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center">
                  <Users className="text-forest" />
                </div>
                <span className="text-lg font-bold text-slate-800">Add New Employee</span>
              </div>
              <ArrowRight className="text-slate-400" />
            </Link>

            <Link
              href="/dashboard/saudi/payroll"
              className="bg-slate-50/50 p-6 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center">
                  <Wallet className="text-forest" />
                </div>
                <span className="text-lg font-bold text-slate-800">Run Payroll</span>
              </div>
              <ArrowRight className="text-slate-400" />
            </Link>

            <Link
              href="/dashboard/saudi/compliance"
              className="bg-slate-50/50 p-6 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center">
                  <ShieldCheck className="text-forest" />
                </div>
                <span className="text-lg font-bold text-slate-800">Review Compliance</span>
              </div>
              <ArrowRight className="text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Saudization Rate */}
        <div className="col-span-4 bg-white rounded-[32px] p-8 shadow-sm border border-gold/20 overflow-hidden relative">
          <h2 className="text-xl font-bold text-slate-800 mb-8">Saudization Rate</h2>
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#fff8e7] rounded-full opacity-70 border border-gold/10" />
          <div className="relative z-10 w-full aspect-square flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl font-black text-forest">
                {loading ? "-" : `${saudization}%`}
              </div>
              <div className="text-slate-400 font-medium uppercase tracking-widest text-xs mt-2">
                Saudi Nationals
              </div>
              <div className="mt-4 text-sm text-slate-500">
                {metrics.saudiCount} / {metrics.totalEmployees} employees
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
