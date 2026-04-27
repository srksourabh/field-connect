"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Plus, Pencil, Loader2, Power, X, Save } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { showToast } from "@/components/ui/Toast";
import { showConfirm } from "@/components/ui/Dialog";
import type { HrSalaryComponent } from "@/lib/database.types";

export default function SalaryComponentsPage() {
  const { session, profile } = useAuth();
  const [components, setComponents] = useState<HrSalaryComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"earning" | "deduction">("earning");
  const [formStatutory, setFormStatutory] = useState(false);
  const [formCalcRule, setFormCalcRule] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const headers = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token}`,
  }), [session]);

  const fetchComponents = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    const url = `/api/admin/salary-components${showInactive ? "?all=true" : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (res.ok) {
      const data = await res.json();
      setComponents(data.components || []);
    }
    setLoading(false);
  }, [session, showInactive]);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  // Role guard
  const hasAccess = profile?.role === "super_admin" ||
    (profile?.designation?.toLowerCase().includes("hr") &&
      ["admin", "super_admin"].includes(profile?.role || ""));
  if (profile && !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-lg font-semibold mb-2">Access Denied</p>
        <p className="text-sm text-gray-500">Only super admins and HR can manage salary components.</p>
      </div>
    );
  }

  const resetForm = () => {
    setFormName("");
    setFormType("earning");
    setFormStatutory(false);
    setFormCalcRule("");
    setFormDescription("");
  };

  const handleAdd = async () => {
    if (!formName.trim()) return;
    setActionLoading("add");
    const res = await fetch("/api/admin/salary-components", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        name: formName.trim(),
        type: formType,
        is_statutory: formStatutory,
        calc_rule: formCalcRule.trim() || null,
        description: formDescription.trim() || null,
      }),
    });
    if (res.ok) {
      showToast("Component added", "success");
      resetForm();
      setShowAddForm(false);
      fetchComponents();
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to add", "error");
    }
    setActionLoading(null);
  };

  const startEdit = (c: HrSalaryComponent) => {
    setEditingId(c.id);
    setFormName(c.name);
    setFormType(c.type);
    setFormStatutory(c.is_statutory);
    setFormCalcRule(c.calc_rule || "");
    setFormDescription(c.description || "");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !formName.trim()) return;
    setActionLoading(editingId);
    const res = await fetch("/api/admin/salary-components", {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({
        id: editingId,
        name: formName.trim(),
        type: formType,
        is_statutory: formStatutory,
        calc_rule: formCalcRule.trim() || null,
        description: formDescription.trim() || null,
      }),
    });
    if (res.ok) {
      showToast("Component updated", "success");
      setEditingId(null);
      resetForm();
      fetchComponents();
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to update", "error");
    }
    setActionLoading(null);
  };

  const handleToggleActive = async (c: HrSalaryComponent) => {
    const action = c.is_active ? "deactivate" : "activate";
    const confirmed = await showConfirm(
      `${c.is_active ? "Deactivate" : "Activate"} Component`,
      `${action.charAt(0).toUpperCase() + action.slice(1)} "${c.name}"?`
    );
    if (!confirmed) return;
    setActionLoading(c.id);
    const res = await fetch("/api/admin/salary-components", {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ id: c.id, is_active: !c.is_active }),
    });
    if (res.ok) {
      fetchComponents();
    } else {
      showToast("Failed to update", "error");
    }
    setActionLoading(null);
  };

  const earnings = components.filter((c) => c.type === "earning");
  const deductions = components.filter((c) => c.type === "deduction");

  return (
    <div className="flex flex-col min-h-screen">
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link href="/dashboard/admin/payroll" className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-lg font-semibold text-center flex-1">Salary Components</h1>
        <button
          onClick={() => { resetForm(); setShowAddForm(true); setEditingId(null); }}
          className="p-2 -mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-5 h-5 text-primary" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 space-y-6">
        {/* Show inactive toggle */}
        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show inactive components
        </label>

        {/* Add Form */}
        {showAddForm && (
          <ComponentForm
            formName={formName} setFormName={setFormName}
            formType={formType} setFormType={setFormType}
            formStatutory={formStatutory} setFormStatutory={setFormStatutory}
            formCalcRule={formCalcRule} setFormCalcRule={setFormCalcRule}
            formDescription={formDescription} setFormDescription={setFormDescription}
            onSave={handleAdd}
            onCancel={() => { setShowAddForm(false); resetForm(); }}
            loading={actionLoading === "add"}
            title="Add Component"
          />
        )}

        {/* Edit Form */}
        {editingId && (
          <ComponentForm
            formName={formName} setFormName={setFormName}
            formType={formType} setFormType={setFormType}
            formStatutory={formStatutory} setFormStatutory={setFormStatutory}
            formCalcRule={formCalcRule} setFormCalcRule={setFormCalcRule}
            formDescription={formDescription} setFormDescription={setFormDescription}
            onSave={handleSaveEdit}
            onCancel={() => { setEditingId(null); resetForm(); }}
            loading={actionLoading === editingId}
            title="Edit Component"
          />
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading...</p>
          </div>
        ) : (
          <>
            {/* Earnings */}
            <Section title="Earnings" items={earnings} onEdit={startEdit} onToggle={handleToggleActive} actionLoading={actionLoading} editingId={editingId} />

            {/* Deductions */}
            <Section title="Deductions" items={deductions} onEdit={startEdit} onToggle={handleToggleActive} actionLoading={actionLoading} editingId={editingId} />
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, items, onEdit, onToggle, actionLoading, editingId }: {
  title: string;
  items: HrSalaryComponent[];
  onEdit: (c: HrSalaryComponent) => void;
  onToggle: (c: HrSalaryComponent) => void;
  actionLoading: string | null;
  editingId: string | null;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{title}</p>
      <div className="space-y-2">
        {items.map((c) => (
          <div
            key={c.id}
            className={`bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 flex items-center justify-between ${!c.is_active ? "opacity-50" : ""}`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate">{c.name}</p>
                {c.is_statutory && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">
                    Statutory
                  </span>
                )}
                {!c.is_active && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                    Inactive
                  </span>
                )}
              </div>
              {c.calc_rule && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.calc_rule}</p>
              )}
              {c.description && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{c.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEdit(c)}
                disabled={editingId !== null}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-primary disabled:opacity-50"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onToggle(c)}
                disabled={actionLoading === c.id}
                className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 ${c.is_active ? "text-gray-400 hover:text-red-500" : "text-green-500 hover:text-green-600"}`}
              >
                {actionLoading === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComponentForm({ formName, setFormName, formType, setFormType, formStatutory, setFormStatutory, formCalcRule, setFormCalcRule, formDescription, setFormDescription, onSave, onCancel, loading, title }: {
  formName: string; setFormName: (v: string) => void;
  formType: "earning" | "deduction"; setFormType: (v: "earning" | "deduction") => void;
  formStatutory: boolean; setFormStatutory: (v: boolean) => void;
  formCalcRule: string; setFormCalcRule: (v: string) => void;
  formDescription: string; setFormDescription: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
  title: string;
}) {
  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-primary/30 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <div className="flex gap-1">
          <button onClick={onSave} disabled={loading || !formName.trim()} className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </button>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <input
        value={formName}
        onChange={(e) => setFormName(e.target.value)}
        placeholder="Component name (e.g., Basic Salary)"
        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <select value={formType} onChange={(e) => setFormType(e.target.value as "earning" | "deduction")} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm">
          <option value="earning">Earning</option>
          <option value="deduction">Deduction</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <input type="checkbox" checked={formStatutory} onChange={(e) => setFormStatutory(e.target.checked)} className="rounded border-gray-300" />
          Statutory
        </label>
      </div>
      <input
        value={formCalcRule}
        onChange={(e) => setFormCalcRule(e.target.value)}
        placeholder="Calculation rule (e.g., 12% of basic)"
        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
      />
      <input
        value={formDescription}
        onChange={(e) => setFormDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
      />
    </div>
  );
}
