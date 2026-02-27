"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Plus, Pencil, Loader2, Check, Power, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { showToast } from "@/components/ui/Toast";
import { showConfirm } from "@/components/ui/Dialog";

interface LeavePolicy {
  id: string;
  name: string;
  sick_leave_count: number;
  casual_leave_count: number;
  privilege_leave_count: number;
  is_active: boolean;
  employee_count: number;
}

export default function LeavePoliciesPage() {
  const { session, profile } = useAuth();
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formSL, setFormSL] = useState(0);
  const [formCL, setFormCL] = useState(0);
  const [formPL, setFormPL] = useState(0);

  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token}`,
  }), [session]);

  const fetchPolicies = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    const res = await fetch("/api/admin/leave-policies?all=true", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setPolicies(data.policies || []);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  // Role guard: only admin/super_admin can access leave policies
  const hasAccess = profile?.role === "admin" || profile?.role === "super_admin";
  if (profile && !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-lg font-semibold mb-2">Access Denied</p>
        <p className="text-sm text-gray-500">You don&apos;t have permission to access this page.</p>
      </div>
    );
  }

  const resetForm = () => {
    setFormName("");
    setFormSL(0);
    setFormCL(0);
    setFormPL(0);
  };

  const handleAdd = async () => {
    if (!formName.trim()) return;
    setActionLoading("add");
    const res = await fetch("/api/admin/leave-policies", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        name: formName.trim(),
        sick_leave_count: formSL,
        casual_leave_count: formCL,
        privilege_leave_count: formPL,
      }),
    });
    if (res.ok) {
      resetForm();
      setShowAddForm(false);
      await fetchPolicies();
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to create policy", "error");
    }
    setActionLoading(null);
  };

  const startEdit = (pol: LeavePolicy) => {
    setEditingId(pol.id);
    setFormName(pol.name);
    setFormSL(pol.sick_leave_count);
    setFormCL(pol.casual_leave_count);
    setFormPL(pol.privilege_leave_count);
  };

  const handleSave = async (id: string) => {
    if (!formName.trim()) return;
    setActionLoading(id);
    const res = await fetch("/api/admin/leave-policies", {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({
        id,
        name: formName.trim(),
        sick_leave_count: formSL,
        casual_leave_count: formCL,
        privilege_leave_count: formPL,
      }),
    });
    if (res.ok) {
      setEditingId(null);
      resetForm();
      await fetchPolicies();
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to update", "error");
    }
    setActionLoading(null);
  };

  const handleToggleActive = async (pol: LeavePolicy) => {
    const action = pol.is_active ? "deactivate" : "reactivate";
    const confirmed = await showConfirm(
      `${pol.is_active ? "Deactivate" : "Reactivate"} Policy`,
      `${action === "deactivate" ? "Deactivate" : "Reactivate"} "${pol.name}"? ${pol.employee_count > 0 ? `${pol.employee_count} employees are currently assigned.` : ""}`
    );
    if (!confirmed) return;

    setActionLoading(pol.id);
    const res = await fetch("/api/admin/leave-policies", {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ id: pol.id, is_active: !pol.is_active }),
    });
    if (res.ok) {
      await fetchPolicies();
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to update", "error");
    }
    setActionLoading(null);
  };

  const PolicyForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-primary/20 space-y-3">
      <input
        type="text"
        value={formName}
        onChange={(e) => setFormName(e.target.value)}
        placeholder="Policy name (e.g. Standard, Probation)"
        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        autoFocus
      />
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Sick Leave</label>
          <input
            type="number"
            value={formSL}
            onChange={(e) => setFormSL(parseInt(e.target.value) || 0)}
            min={0}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-center"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Casual Leave</label>
          <input
            type="number"
            value={formCL}
            onChange={(e) => setFormCL(parseInt(e.target.value) || 0)}
            min={0}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-center"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Privilege Leave</label>
          <input
            type="number"
            value={formPL}
            onChange={(e) => setFormPL(parseInt(e.target.value) || 0)}
            min={0}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-center"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSubmit}
          disabled={actionLoading !== null || !formName.trim()}
          className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {submitLabel}
        </button>
        <button
          onClick={() => { setShowAddForm(false); setEditingId(null); resetForm(); }}
          className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link
          href="/dashboard/organisation"
          className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-lg font-semibold text-center flex-1">Leave Policies</h1>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); resetForm(); }}
          className="p-2 -mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-5 h-5 text-primary" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 space-y-3">
        {/* Add form */}
        {showAddForm && <PolicyForm onSubmit={handleAdd} submitLabel="Create Policy" />}

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading...</p>
          </div>
        ) : policies.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No leave policies found</p>
            <p className="text-xs mt-1">Create a policy to assign standardized leave counts to employees</p>
          </div>
        ) : (
          policies.map((pol) => (
            <div
              key={pol.id}
              className={`bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 ${!pol.is_active ? "opacity-60" : ""}`}
            >
              {editingId === pol.id ? (
                <PolicyForm onSubmit={() => handleSave(pol.id)} submitLabel="Save" />
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold">{pol.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {pol.employee_count} employee{pol.employee_count !== 1 ? "s" : ""}
                        {!pol.is_active && <span className="ml-2 text-red-500">(Inactive)</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(pol)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-primary"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(pol)}
                        disabled={actionLoading === pol.id}
                        className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 ${pol.is_active ? "text-gray-400 hover:text-red-500" : "text-green-500 hover:text-green-600"}`}
                      >
                        {actionLoading === pol.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2 text-center">
                      <p className="text-xs text-gray-500">SL</p>
                      <p className="text-sm font-semibold">{pol.sick_leave_count}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2 text-center">
                      <p className="text-xs text-gray-500">CL</p>
                      <p className="text-sm font-semibold">{pol.casual_leave_count}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2 text-center">
                      <p className="text-xs text-gray-500">PL</p>
                      <p className="text-sm font-semibold">{pol.privilege_leave_count}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
