"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, Search, Save, Loader2, IndianRupee } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { showToast } from "@/components/ui/Toast";
import type { HrSalaryComponent } from "@/lib/database.types";

interface EmployeeOption {
  id: string;
  full_name: string;
  designation: string | null;
  project_id: string | null;
}

export default function EmployeeSalaryPage() {
  const { session, profile } = useAuth();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [components, setComponents] = useState<HrSalaryComponent[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [payrollPrefs, setPayrollPrefs] = useState({ tds_regime: "new", pf_opted_out: false, uan_number: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [fetchingEmployee, setFetchingEmployee] = useState(false);

  const hasAccess = profile?.role === "super_admin" ||
    (profile?.designation?.toLowerCase().includes("hr") &&
      ["admin", "super_admin"].includes(profile?.role || ""));

  // Fetch employees and components on mount
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [{ data: emps }, { data: comps }] = await Promise.all([
        supabase
          .from("hr_profiles")
          .select("id, full_name, designation, project_id")
          .is("deactivated_at", null)
          .order("full_name")
          .limit(500),
        supabase
          .from("hr_salary_components")
          .select("*")
          .eq("is_active", true)
          .order("type")
          .order("name"),
      ]);
      setEmployees(emps || []);
      setComponents(comps || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Fetch salary when employee changes
  const fetchEmployeeSalary = useCallback(async (empId: string) => {
    if (!empId || !session?.access_token) return;
    setFetchingEmployee(true);
    const res = await fetch(`/api/admin/employee-salary?employee_id=${empId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      const newAmounts: Record<string, number> = {};
      for (const entry of data.salary || []) {
        newAmounts[entry.component_id] = entry.amount;
      }
      setAmounts(newAmounts);
      if (data.payroll_prefs) {
        setPayrollPrefs({
          tds_regime: data.payroll_prefs.tds_regime || "new",
          pf_opted_out: data.payroll_prefs.pf_opted_out || false,
          uan_number: data.payroll_prefs.uan_number || "",
        });
      }
    } else {
      setAmounts({});
      setPayrollPrefs({ tds_regime: "new", pf_opted_out: false, uan_number: "" });
    }
    setFetchingEmployee(false);
  }, [session]);

  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeSalary(selectedEmployee);
    } else {
      setAmounts({});
    }
  }, [selectedEmployee, fetchEmployeeSalary]);

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter((e) =>
      e.full_name.toLowerCase().includes(q) ||
      (e.designation && e.designation.toLowerCase().includes(q))
    );
  }, [employees, searchQuery]);

  const earnings = components.filter((c) => c.type === "earning");
  const deductions = components.filter((c) => c.type === "deduction");

  const totalEarnings = earnings.reduce((sum, c) => sum + (amounts[c.id] || 0), 0);
  const totalDeductions = deductions.reduce((sum, c) => sum + (amounts[c.id] || 0), 0);

  const handleSavePrefs = async () => {
    if (!selectedEmployee || !session?.access_token) return;
    setSavingPrefs(true);
    const res = await fetch("/api/admin/employee-salary", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ employee_id: selectedEmployee, ...payrollPrefs }),
    });
    if (res.ok) {
      showToast("Preferences saved", "success");
    } else {
      const d = await res.json();
      showToast(d.error || "Failed to save preferences", "error");
    }
    setSavingPrefs(false);
  };

  const handleSave = async () => {
    if (!selectedEmployee || !session?.access_token) return;
    setSaving(true);

    const componentData = components
      .filter((c) => (amounts[c.id] || 0) > 0)
      .map((c) => ({
        component_id: c.id,
        amount: amounts[c.id] || 0,
      }));

    const res = await fetch("/api/admin/employee-salary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        employee_id: selectedEmployee,
        components: componentData,
      }),
    });

    if (res.ok) {
      showToast("Salary structure saved", "success");
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to save", "error");
    }
    setSaving(false);
  };

  if (profile && !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-lg font-semibold mb-2">Access Denied</p>
        <p className="text-sm text-gray-500">Only super admins and HR can manage salaries.</p>
      </div>
    );
  }

  const selectedEmpName = employees.find((e) => e.id === selectedEmployee)?.full_name;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link href="/dashboard/admin/payroll" className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-lg font-semibold text-center flex-1">Employee Salary</h1>
        <div className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 space-y-4">
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading...</p>
          </div>
        ) : (
          <>
            {/* Employee Selector */}
            <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-100 dark:border-gray-700/50">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Select Employee</label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                size={Math.min(filteredEmployees.length + 1, 6)}
              >
                <option value="">-- Select Employee --</option>
                {filteredEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name} {e.designation ? `· ${e.designation}` : ""} {e.project_id ? `· ${e.project_id}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Salary Form */}
            {selectedEmployee && (
              fetchingEmployee ? (
                <div className="text-center py-8 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Loading salary...</p>
                </div>
              ) : (
                <>
                  {/* CTC Summary */}
                  <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-xl p-4 border border-primary/20">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{selectedEmpName}</p>
                    <div className="flex items-center gap-1">
                      <IndianRupee className="w-5 h-5 text-primary" />
                      <p className="text-2xl font-bold text-primary">
                        {totalEarnings.toLocaleString("en-IN")}
                      </p>
                      <span className="text-sm text-gray-500 ml-1">/ month (gross)</span>
                    </div>
                    {totalDeductions > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Deductions: ₹{totalDeductions.toLocaleString("en-IN")} · Net: ₹{(totalEarnings - totalDeductions).toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>

                  {/* Payroll Preferences */}
                  <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Payroll Preferences</p>

                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">TDS Regime</label>
                      <div className="flex gap-2">
                        {["new", "old"].map((r) => (
                          <button
                            key={r}
                            onClick={() => setPayrollPrefs((p) => ({ ...p, tds_regime: r }))}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                              payrollPrefs.tds_regime === r
                                ? "bg-primary text-white border-primary"
                                : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                            }`}
                          >
                            {r === "new" ? "New Regime" : "Old Regime"}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {payrollPrefs.tds_regime === "new"
                          ? "Std. deduction ₹75k, lower slabs, no exemptions"
                          : "Std. deduction ₹50k + 80C, higher slabs with exemptions"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">PF Opt-out</p>
                        <p className="text-[11px] text-gray-400">Skip employee & employer PF</p>
                      </div>
                      <button
                        onClick={() => setPayrollPrefs((p) => ({ ...p, pf_opted_out: !p.pf_opted_out }))}
                        className={`relative w-10 h-6 rounded-full transition-colors ${payrollPrefs.pf_opted_out ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"}`}
                      >
                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${payrollPrefs.pf_opted_out ? "translate-x-5" : "translate-x-1"}`} />
                      </button>
                    </div>

                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">UAN Number</label>
                      <input
                        type="text"
                        value={payrollPrefs.uan_number}
                        onChange={(e) => setPayrollPrefs((p) => ({ ...p, uan_number: e.target.value }))}
                        placeholder="101234567890"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>

                    <button
                      onClick={handleSavePrefs}
                      disabled={savingPrefs}
                      className="w-full py-2.5 rounded-xl bg-gray-700 dark:bg-gray-600 text-white font-medium text-sm hover:bg-gray-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                      {savingPrefs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {savingPrefs ? "Saving..." : "Save Preferences"}
                    </button>
                  </div>

                  {/* Earnings */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Earnings</p>
                    <div className="space-y-2">
                      {earnings.map((c) => (
                        <div key={c.id} className="bg-white dark:bg-surface-dark rounded-xl p-3 border border-gray-100 dark:border-gray-700/50 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{c.name}</p>
                            {c.description && <p className="text-[11px] text-gray-400 truncate">{c.description}</p>}
                          </div>
                          <div className="relative w-28 shrink-0">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={amounts[c.id] || ""}
                              onChange={(e) => setAmounts((prev) => ({ ...prev, [c.id]: parseFloat(e.target.value) || 0 }))}
                              placeholder="0"
                              className="w-full pl-7 pr-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deductions */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Deductions (monthly fixed amounts)</p>
                    <p className="text-[11px] text-gray-400 mb-2 px-1">Statutory deductions (PF, ESI, PT) are auto-calculated during payroll. Set fixed amounts here only for overrides.</p>
                    <div className="space-y-2">
                      {deductions.map((c) => (
                        <div key={c.id} className="bg-white dark:bg-surface-dark rounded-xl p-3 border border-gray-100 dark:border-gray-700/50 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium truncate">{c.name}</p>
                              {c.is_statutory && (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">Auto</span>
                              )}
                            </div>
                            {c.calc_rule && <p className="text-[11px] text-gray-400">{c.calc_rule}</p>}
                          </div>
                          <div className="relative w-28 shrink-0">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={amounts[c.id] || ""}
                              onChange={(e) => setAmounts((prev) => ({ ...prev, [c.id]: parseFloat(e.target.value) || 0 }))}
                              placeholder="Auto"
                              className="w-full pl-7 pr-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Save */}
                  <button
                    onClick={handleSave}
                    disabled={saving || totalEarnings === 0}
                    className="w-full py-3 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? "Saving..." : "Save Salary Structure"}
                  </button>
                </>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
