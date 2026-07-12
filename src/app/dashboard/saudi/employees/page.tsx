"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Plus, Search, Users } from "lucide-react";
import type { SaudiEmployee } from "@/lib/saudi/types";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  on_leave: "bg-amber-100 text-amber-700",
  suspended: "bg-red-100 text-red-700",
  terminated: "bg-gray-100 text-gray-600",
};

export default function SaudiEmployeesPage() {
  const [employees, setEmployees] = useState<SaudiEmployee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("saudi_employees").select("*").order("full_name");
      if (data) setEmployees(data);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = employees.filter((e) =>
    e.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 font-satoshi">Employees</h1>
          <p className="text-slate-400 text-sm mt-1">{employees.length} total employees</p>
        </div>
        <Link
          href="/dashboard/saudi/employees/new"
          className="inline-flex items-center gap-2 bg-forest text-white rounded-full px-6 py-2.5 font-medium hover:bg-forest-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Employee
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-full border border-gold/20 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-gold/30"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-forest border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Users className="w-14 h-14 mb-4 opacity-40" />
          <p className="text-lg font-medium text-slate-500">No employees found</p>
          <p className="text-sm mt-1">Add your first Saudi employee to get started.</p>
        </div>
      ) : (
        <div className="rounded-[32px] border border-gold/20 bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Nationality</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Basic Salary</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Hire Date</th>
                <th className="w-10 px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((emp) => (
                <tr
                  key={emp.id}
                  className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/dashboard/saudi/employees/${emp.id}`}
                >
                  <td className="px-6 py-4 text-sm font-semibold text-slate-800">{emp.full_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{emp.nationality === "saudi" ? "Saudi" : "Expat"}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${statusColors[emp.employment_status] || statusColors.active}`}>
                      {emp.employment_status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">SAR {Number(emp.salary_basic).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{emp.hire_date}</td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/saudi/employees/${emp.id}`}
                      className="text-forest text-sm font-medium hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View
                    </Link>
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
