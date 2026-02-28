"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, Loader2, Clock, TrendingUp, AlertTriangle, Award } from "lucide-react";
import { logError } from "@/lib/utils";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import SummaryCards from "@/components/analytics/SummaryCards";
import InsightsList from "@/components/analytics/InsightsList";
import EmployeeStatsTable from "@/components/analytics/EmployeeStatsTable";
import AttendanceTrendChart from "@/components/analytics/AttendanceTrendChart";
import PunchInDistribution from "@/components/analytics/PunchInDistribution";
import DayOfWeekChart from "@/components/analytics/DayOfWeekChart";
import BreakdownCards from "@/components/analytics/BreakdownCards";
import WeeklyComparison from "@/components/analytics/WeeklyComparison";

interface AnalyticsData {
  summary: {
    totalEmployees: number;
    presentToday: number;
    absentToday: number;
    onLeaveToday: number;
    inFieldNow: number;
  };
  attendance: {
    avgHoursWorked: number;
    avgPunchInTime: string;
    lateCount: number;
    perfectAttendanceCount: number;
  };
  employeeStats: {
    id: string;
    name: string;
    designation: string | null;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    avgHours: number;
  }[];
  trends: { date: string; count: number }[];
  insights: { type: "warning" | "positive" | "info"; text: string }[];
  punchInDistribution: { hour: number; count: number }[];
  dayOfWeekPattern: { day: string; avgPresent: number; avgHours: number; totalRecords: number }[];
  projectBreakdown: { name: string; employees: number; avgHours: number; latePercent: number }[];
  departmentBreakdown: { name: string; employees: number; avgHours: number; latePercent: number }[];
  weeklyComparison: { week: string; presentCount: number; avgHours: number }[];
}

type Period = "this_month" | "last_month" | "last_3_months";

export default function AnalyticsPage() {
  const { profile, session } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("this_month");

  const fetchData = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${period}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    } catch (err) {
      logError("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (profile && profile.role === "employee") {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Manager or Admin access required</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link
          href="/dashboard"
          className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-lg font-semibold text-center flex-1">Analytics</h1>
        <div className="w-9" />
      </header>

      <div className="px-5 py-4 space-y-4 max-w-4xl mx-auto">
        {/* Period Selector */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {([
            { key: "this_month", label: "This Month" },
            { key: "last_month", label: "Last Month" },
            { key: "last_3_months", label: "Last 3 Months" },
          ] as const).map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                period === p.key
                  ? "bg-primary text-white"
                  : "bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <SummaryCards {...data.summary} />

            {/* Insights */}
            <InsightsList insights={data.insights} />

            {/* Attendance Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={Clock} label="Avg Hours" value={`${data.attendance.avgHoursWorked}h`} color="text-blue-600" bg="bg-blue-100 dark:bg-blue-900/20" />
              <StatCard icon={TrendingUp} label="Avg Punch-In" value={data.attendance.avgPunchInTime} color="text-indigo-600" bg="bg-indigo-100 dark:bg-indigo-900/20" />
              <StatCard icon={AlertTriangle} label="Late Count" value={String(data.attendance.lateCount)} color="text-amber-600" bg="bg-amber-100 dark:bg-amber-900/20" />
              <StatCard icon={Award} label="Perfect" value={String(data.attendance.perfectAttendanceCount)} color="text-green-600" bg="bg-green-100 dark:bg-green-900/20" />
            </div>

            {/* Punch-In Distribution + Day of Week */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PunchInDistribution data={data.punchInDistribution} />
              <DayOfWeekChart data={data.dayOfWeekPattern} />
            </div>

            {/* Weekly Comparison */}
            <WeeklyComparison data={data.weeklyComparison} />

            {/* Project + Department Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BreakdownCards title="By Project" type="project" data={data.projectBreakdown} />
              <BreakdownCards title="By Department" type="department" data={data.departmentBreakdown} />
            </div>

            {/* Trend Chart */}
            <AttendanceTrendChart data={data.trends} maxEmployees={data.summary.totalEmployees} />

            {/* Employee Table */}
            <EmployeeStatsTable stats={data.employeeStats} />
          </>
        ) : (
          <p className="text-center text-gray-500 py-8">No data available</p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, color, bg,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 p-4">
      <div className={`${bg} w-8 h-8 rounded-lg flex items-center justify-center mb-2`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
