"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ChevronLeft, Users, Check, AlertCircle, Loader2, Pencil, Save, X, Upload, FileText, Trash2, CheckSquare, Square } from "lucide-react";
import { logError } from "@/lib/utils";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { showConfirm } from "@/components/ui/Dialog";
import { showToast } from "@/components/ui/Toast";

interface EmployeeBalance {
  id: string;
  full_name: string;
  designation: string | null;
  department: string | null;
  role: string;
  balance: {
    id: string;
    sick_leave_total: number;
    sick_leave_used: number;
    casual_leave_total: number;
    casual_leave_used: number;
    compoff_total: number;
    compoff_used: number;
    privilege_leave_total: number;
    privilege_leave_used: number;
  } | null;
}

export default function LeaveAllotmentPage() {
  const { profile, session } = useAuth();
  const [employees, setEmployees] = useState<EmployeeBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [allotting, setAllotting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [policyUrl, setPolicyUrl] = useState<string | null>(null);
  const [uploadingPolicy, setUploadingPolicy] = useState(false);
  const policyInputRef = useRef<HTMLInputElement>(null);
  const [hrPolicyUrl, setHrPolicyUrl] = useState<string | null>(null);
  const [uploadingHrPolicy, setUploadingHrPolicy] = useState(false);
  const hrPolicyInputRef = useRef<HTMLInputElement>(null);

  // Bulk edit state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkValues, setBulkValues] = useState<Record<string, number>>({ compoff_total: 0 });
  const [bulkSaving, setBulkSaving] = useState(false);

  const year = new Date().getFullYear();

  const isUniversal =
    profile?.role === "super_admin" ||
    (profile?.designation?.toLowerCase().includes("hr") &&
      ["admin", "super_admin"].includes(profile?.role || ""));

  const fetchData = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch(`/api/admin/leave-allotment?year=${year}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (err) {
      logError("Fetch leave allotment error:", err);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch policy URLs from hr_config
  useEffect(() => {
    (async () => {
      const { data: leavePolicy } = await supabase
        .from("hr_config")
        .select("value")
        .eq("key", "leave_policy_url")
        .maybeSingle();
      if (leavePolicy?.value) setPolicyUrl(leavePolicy.value);

      const { data: hrPolicy } = await supabase
        .from("hr_config")
        .select("value")
        .eq("key", "hr_policy_url")
        .maybeSingle();
      if (hrPolicy?.value) setHrPolicyUrl(hrPolicy.value);
    })();
  }, []);

  const handlePolicyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.includes("pdf")) {
      showToast("Only PDF files are accepted.", "error");
      return;
    }
    setUploadingPolicy(true);

    const filePath = `leave-policy-${Date.now()}.pdf`;
    const { error } = await supabase.storage
      .from("policy-documents")
      .upload(filePath, file, { upsert: true });

    if (error) {
      showToast("Upload failed: " + error.message, "error");
      setUploadingPolicy(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("policy-documents")
      .getPublicUrl(filePath);

    const url = urlData.publicUrl;

    await supabase.from("hr_config").upsert(
      { key: "leave_policy_url", value: url, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

    setPolicyUrl(url);
    setUploadingPolicy(false);
    if (policyInputRef.current) policyInputRef.current.value = "";
  };

  const handleRemovePolicy = async () => {
    const confirmed = await showConfirm("Remove Policy", "Remove leave policy document?");
    if (!confirmed) return;
    await supabase.from("hr_config").update({ value: null }).eq("key", "leave_policy_url");
    setPolicyUrl(null);
  };

  const handleHrPolicyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.includes("pdf")) {
      showToast("Only PDF files are accepted.", "error");
      return;
    }
    setUploadingHrPolicy(true);

    const filePath = `hr-policy-${Date.now()}.pdf`;
    const { error } = await supabase.storage
      .from("policy-documents")
      .upload(filePath, file, { upsert: true });

    if (error) {
      showToast("Upload failed: " + error.message, "error");
      setUploadingHrPolicy(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("policy-documents")
      .getPublicUrl(filePath);

    const url = urlData.publicUrl;

    await supabase.from("hr_config").upsert(
      { key: "hr_policy_url", value: url, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

    setHrPolicyUrl(url);
    setUploadingHrPolicy(false);
    if (hrPolicyInputRef.current) hrPolicyInputRef.current.value = "";
  };

  const handleRemoveHrPolicy = async () => {
    const confirmed = await showConfirm("Remove Policy", "Remove general HR policy document?");
    if (!confirmed) return;
    await supabase.from("hr_config").update({ value: null }).eq("key", "hr_policy_url");
    setHrPolicyUrl(null);
  };

  // Admin guard
  if (profile && !["admin", "super_admin"].includes(profile.role)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Admin access required</p>
      </div>
    );
  }

  const handleBulkAllot = async () => {
    if (!session?.access_token) return;
    setAllotting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/leave-allotment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ year, sick_total: 5, casual_total: 10, privilege_total: 15 }),
      });
      const data = await res.json();
      setMessage({ type: "success", text: data.message });
      fetchData();
    } catch {
      setMessage({ type: "error", text: "Failed to allot leaves" });
    } finally {
      setAllotting(false);
    }
  };

  const startEdit = (emp: EmployeeBalance) => {
    if (!emp.balance) return;
    setEditingId(emp.id);
    setEditValues({
      sick_leave_total: emp.balance.sick_leave_total,
      sick_leave_used: emp.balance.sick_leave_used,
      casual_leave_total: emp.balance.casual_leave_total,
      casual_leave_used: emp.balance.casual_leave_used,
      privilege_leave_total: emp.balance.privilege_leave_total,
      privilege_leave_used: emp.balance.privilege_leave_used,
      compoff_total: emp.balance.compoff_total,
      compoff_used: emp.balance.compoff_used,
    });
  };

  const saveEdit = async (emp: EmployeeBalance) => {
    if (!emp.balance || !session?.access_token) return;
    try {
      const res = await fetch("/api/admin/leave-allotment", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ balance_id: emp.balance.id, ...editValues }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchData();
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save changes" });
    }
  };

  // Bulk edit handlers
  const toggleSelect = (empId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) {
        next.delete(empId);
      } else {
        next.add(empId);
      }
      return next;
    });
  };

  const selectAll = () => {
    const withBalance = employees.filter((e) => e.balance);
    if (selectedIds.size === withBalance.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(withBalance.map((e) => e.id)));
    }
  };

  const handleBulkSave = async () => {
    if (!session?.access_token || selectedIds.size === 0) return;
    setBulkSaving(true);

    const balanceIds = employees
      .filter((e) => selectedIds.has(e.id) && e.balance)
      .map((e) => e.balance!.id);

    try {
      const res = await fetch("/api/admin/leave-allotment", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ balance_ids: balanceIds, updates: bulkValues }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Updated ${data.updated} employees`, "success");
        setBulkMode(false);
        setSelectedIds(new Set());
        fetchData();
      } else {
        showToast(data.error || "Bulk update failed", "error");
      }
    } catch {
      showToast("Bulk update failed", "error");
    } finally {
      setBulkSaving(false);
    }
  };

  const missingCount = employees.filter((e) => !e.balance).length;
  const withBalance = employees.filter((e) => e.balance);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link
          href="/dashboard/admin"
          className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-lg font-semibold text-center flex-1">Leave Allotment</h1>
        <div className="w-9" />
      </header>

      <div className="px-5 py-4 space-y-4 max-w-4xl mx-auto">
        {/* Policy Summary */}
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 p-4">
          <h3 className="text-sm font-semibold mb-2">Default Leave Policy</h3>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-400" />
              <span className="text-gray-600 dark:text-gray-400">Sick: <strong>5</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-400" />
              <span className="text-gray-600 dark:text-gray-400">Casual: <strong>10</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-400" />
              <span className="text-gray-600 dark:text-gray-400">Privilege: <strong>15</strong></span>
            </div>
          </div>
          {!isUniversal && (
            <p className="text-xs text-gray-400 mt-2">
              You can only edit Comp Off balances. Contact super admin or HR to modify CL/SL/PL.
            </p>
          )}
        </div>

        {/* Policy Document Upload */}
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 p-4">
          <h3 className="text-sm font-semibold mb-3">Leave Policy Document</h3>
          <input
            ref={policyInputRef}
            type="file"
            accept=".pdf"
            onChange={handlePolicyUpload}
            className="hidden"
          />
          {policyUrl ? (
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary shrink-0" />
              <a
                href={policyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline truncate flex-1"
              >
                View current policy PDF
              </a>
              <button
                onClick={() => policyInputRef.current?.click()}
                className="text-xs text-gray-500 hover:text-primary px-2 py-1 rounded border border-gray-200 dark:border-gray-700"
              >
                Replace
              </button>
              <button
                onClick={handleRemovePolicy}
                className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => policyInputRef.current?.click()}
              disabled={uploadingPolicy}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
            >
              {uploadingPolicy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploadingPolicy ? "Uploading..." : "Upload policy PDF"}
            </button>
          )}
        </div>

        {/* General HR Policy Upload */}
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 p-4">
          <h3 className="text-sm font-semibold mb-3">General HR Policy</h3>
          <input
            ref={hrPolicyInputRef}
            type="file"
            accept=".pdf"
            onChange={handleHrPolicyUpload}
            className="hidden"
          />
          {hrPolicyUrl ? (
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary shrink-0" />
              <a
                href={hrPolicyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline truncate flex-1"
              >
                View current HR policy PDF
              </a>
              <button
                onClick={() => hrPolicyInputRef.current?.click()}
                className="text-xs text-gray-500 hover:text-primary px-2 py-1 rounded border border-gray-200 dark:border-gray-700"
              >
                Replace
              </button>
              <button
                onClick={handleRemoveHrPolicy}
                className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => hrPolicyInputRef.current?.click()}
              disabled={uploadingHrPolicy}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
            >
              {uploadingHrPolicy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploadingHrPolicy ? "Uploading..." : "Upload general HR policy PDF"}
            </button>
          )}
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <Users className="w-4 h-4 inline mr-1" />
            {employees.length} employees, {missingCount} missing balances
          </div>
          <div className="flex gap-2">
            {withBalance.length > 0 && (
              <button
                onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
                className={`px-3 py-2 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                  bulkMode
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                {bulkMode ? "Cancel Bulk" : "Bulk Edit"}
              </button>
            )}
            <button
              onClick={handleBulkAllot}
              disabled={allotting || missingCount === 0}
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {allotting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Allot Leaves for {year}
            </button>
          </div>
        </div>

        {/* Bulk Edit Panel */}
        {bulkMode && (
          <div className="bg-white dark:bg-surface-dark rounded-xl border-2 border-primary/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Bulk Update — {selectedIds.size} selected
              </h3>
              <button
                onClick={selectAll}
                className="text-xs text-primary hover:text-primary/80"
              >
                {selectedIds.size === withBalance.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {isUniversal && (
                <>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Sick Leave Total</label>
                    <input
                      type="number"
                      min={0}
                      value={bulkValues.sick_leave_total ?? ""}
                      onChange={(e) => setBulkValues((p) => ({ ...p, sick_leave_total: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Casual Leave Total</label>
                    <input
                      type="number"
                      min={0}
                      value={bulkValues.casual_leave_total ?? ""}
                      onChange={(e) => setBulkValues((p) => ({ ...p, casual_leave_total: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Privilege Leave Total</label>
                    <input
                      type="number"
                      min={0}
                      value={bulkValues.privilege_leave_total ?? ""}
                      onChange={(e) => setBulkValues((p) => ({ ...p, privilege_leave_total: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                      placeholder="—"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Comp Off Total</label>
                <input
                  type="number"
                  min={0}
                  value={bulkValues.compoff_total ?? ""}
                  onChange={(e) => setBulkValues((p) => ({ ...p, compoff_total: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                  placeholder="—"
                />
              </div>
            </div>
            <button
              onClick={handleBulkSave}
              disabled={bulkSaving || selectedIds.size === 0}
              className="w-full py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {bulkSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Update {selectedIds.size} Employees
            </button>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
            message.type === "success" ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          }`}>
            {message.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        {/* Employee List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-2">
            {employees.map((emp) => {
              const isEditing = editingId === emp.id;
              const b = emp.balance;

              return (
                <div
                  key={emp.id}
                  className={`bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 p-4 ${
                    bulkMode && selectedIds.has(emp.id) ? "ring-2 ring-primary/40" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {bulkMode && b && (
                        <button onClick={() => toggleSelect(emp.id)} className="shrink-0">
                          {selectedIds.has(emp.id) ? (
                            <CheckSquare className="w-5 h-5 text-primary" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      )}
                      <div>
                        <p className="text-sm font-semibold">{emp.full_name}</p>
                        <p className="text-xs text-gray-500">{emp.designation || emp.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {b ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          Missing
                        </span>
                      )}
                      {b && !isEditing && !bulkMode && (
                        <button onClick={() => startEdit(emp)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                          <Pencil className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                      )}
                      {isEditing && (
                        <>
                          <button onClick={() => saveEdit(emp)} className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded">
                            <Save className="w-3.5 h-3.5 text-green-600" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
                            <X className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {b && (
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <LeaveCell
                        label="Sick"
                        color="orange"
                        used={isEditing ? editValues.sick_leave_used : b.sick_leave_used}
                        total={isEditing ? editValues.sick_leave_total : b.sick_leave_total}
                        editing={isEditing && !!isUniversal}
                        onChangeUsed={(v) => setEditValues((p) => ({ ...p, sick_leave_used: v }))}
                        onChangeTotal={(v) => setEditValues((p) => ({ ...p, sick_leave_total: v }))}
                      />
                      <LeaveCell
                        label="Casual"
                        color="blue"
                        used={isEditing ? editValues.casual_leave_used : b.casual_leave_used}
                        total={isEditing ? editValues.casual_leave_total : b.casual_leave_total}
                        editing={isEditing && !!isUniversal}
                        onChangeUsed={(v) => setEditValues((p) => ({ ...p, casual_leave_used: v }))}
                        onChangeTotal={(v) => setEditValues((p) => ({ ...p, casual_leave_total: v }))}
                      />
                      <LeaveCell
                        label="Privilege"
                        color="purple"
                        used={isEditing ? editValues.privilege_leave_used : b.privilege_leave_used}
                        total={isEditing ? editValues.privilege_leave_total : b.privilege_leave_total}
                        editing={isEditing && !!isUniversal}
                        onChangeUsed={(v) => setEditValues((p) => ({ ...p, privilege_leave_used: v }))}
                        onChangeTotal={(v) => setEditValues((p) => ({ ...p, privilege_leave_total: v }))}
                      />
                      <LeaveCell
                        label="Comp Off"
                        color="teal"
                        used={isEditing ? editValues.compoff_used : b.compoff_used}
                        total={isEditing ? editValues.compoff_total : b.compoff_total}
                        editing={isEditing}
                        onChangeUsed={(v) => setEditValues((p) => ({ ...p, compoff_used: v }))}
                        onChangeTotal={(v) => setEditValues((p) => ({ ...p, compoff_total: v }))}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function LeaveCell({
  label, color, used, total, editing, onChangeUsed, onChangeTotal,
}: {
  label: string;
  color: string;
  used: number;
  total: number;
  editing: boolean;
  onChangeUsed: (v: number) => void;
  onChangeTotal: (v: number) => void;
}) {
  const colorMap: Record<string, string> = {
    orange: "text-orange-600 dark:text-orange-400",
    blue: "text-blue-600 dark:text-blue-400",
    purple: "text-purple-600 dark:text-purple-400",
    teal: "text-teal-600 dark:text-teal-400",
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center">
      <p className={`font-medium mb-1 ${colorMap[color] || ""}`}>{label}</p>
      {editing ? (
        <div className="flex items-center justify-center gap-1">
          <input
            type="number"
            min={0}
            value={used}
            onChange={(e) => onChangeUsed(parseInt(e.target.value) || 0)}
            className="w-10 text-center bg-white dark:bg-gray-700 border rounded text-xs py-0.5"
          />
          <span>/</span>
          <input
            type="number"
            min={0}
            value={total}
            onChange={(e) => onChangeTotal(parseInt(e.target.value) || 0)}
            className="w-10 text-center bg-white dark:bg-gray-700 border rounded text-xs py-0.5"
          />
        </div>
      ) : (
        <p className="text-gray-700 dark:text-gray-300">
          {used} / {total}
        </p>
      )}
    </div>
  );
}
