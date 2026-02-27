"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  Shield,
  Loader2,
  Search,
  KeyRound,
  Pencil,
  UserX,
  UserCheck,
  X,
  Save,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { showConfirm } from "@/components/ui/Dialog";
import { showToast } from "@/components/ui/Toast";
import { useMasterData } from "@/hooks/useMasterData";
import type { HrProfile } from "@/lib/database.types";

interface ManagerOption {
  id: string;
  full_name: string;
}

export default function EmployeeManagementPage() {
  const { user, profile, session } = useAuth();
  const [profiles, setProfiles] = useState<HrProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "deactivated" | "all">("active");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [managers, setManagers] = useState<ManagerOption[]>([]);

  const projects = useMasterData("project");
  const departments = useMasterData("department");
  const designations = useMasterData("designation");

  const isUniversal =
    profile?.role === "super_admin" ||
    (profile?.designation?.toLowerCase().includes("hr") &&
      ["admin", "super_admin"].includes(profile?.role || ""));

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("hr_profiles")
      .select("*")
      .order("full_name", { ascending: true });

    // Regular admins only see their project
    if (profile && !isUniversal && profile.project_id) {
      query = query.eq("project_id", profile.project_id);
    }

    const { data } = await query;
    setProfiles(data || []);
    setLoading(false);
  }, [profile, isUniversal]);

  useEffect(() => {
    if (profile) fetchProfiles();
  }, [profile, fetchProfiles]);

  useEffect(() => {
    async function fetchManagers() {
      const { data } = await supabase
        .from("hr_profiles")
        .select("id, full_name")
        .in("role", ["manager", "admin", "super_admin"])
        .order("full_name");
      setManagers(data || []);
    }
    fetchManagers();
  }, []);

  const filteredProfiles = useMemo(() => {
    let result = profiles;

    // Project filter (for universal users)
    if (projectFilter !== "all") {
      result = result.filter((p) => p.project_id === projectFilter);
    }

    // Status filter
    if (statusFilter === "active") {
      result = result.filter((p) => !p.deactivated_at);
    } else if (statusFilter === "deactivated") {
      result = result.filter((p) => !!p.deactivated_at);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.full_name.toLowerCase().includes(q) ||
          (p.phone && p.phone.includes(q)) ||
          (p.designation && p.designation.toLowerCase().includes(q))
      );
    }

    return result;
  }, [profiles, searchQuery, projectFilter, statusFilter]);

  const counts = useMemo(() => {
    const active = profiles.filter((p) => !p.deactivated_at);
    return {
      total: active.length,
      admins: active.filter((p) => p.role === "admin" || p.role === "super_admin").length,
      managers: active.filter((p) => p.role === "manager").length,
      employees: active.filter((p) => p.role === "employee").length,
    };
  }, [profiles]);

  const handleResetPassword = async (targetUser: HrProfile) => {
    const confirmReset = await showConfirm(
      "Reset Password",
      `Reset password for ${targetUser.full_name}? New password will be: first 4 letters of name (lowercase) + last 4 digits of phone.`
    );
    if (!confirmReset) return;

    setActionLoading(targetUser.id);
    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ userId: targetUser.id }),
    });

    if (res.ok) {
      showToast(`Password reset for ${targetUser.full_name}.`, "success");
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to reset password.", "error");
    }
    setActionLoading(null);
  };

  const handleDeactivate = async (targetUser: HrProfile) => {
    const isDeactivated = !!targetUser.deactivated_at;
    const action = isDeactivated ? "restore" : "deactivate";
    const confirmed = await showConfirm(
      isDeactivated ? "Restore Employee" : "Deactivate Employee",
      `${isDeactivated ? "Restore" : "Deactivate"} ${targetUser.full_name}?`
    );
    if (!confirmed) return;

    setActionLoading(targetUser.id);
    const res = await fetch("/api/admin/deactivate-employee", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ userId: targetUser.id, restore: isDeactivated }),
    });

    if (res.ok) {
      await fetchProfiles();
    } else {
      const data = await res.json();
      showToast(data.error || `Failed to ${action}.`, "error");
    }
    setActionLoading(null);
  };

  const startEdit = (p: HrProfile) => {
    setEditingId(p.id);
    setEditValues({
      full_name: p.full_name,
      phone: p.phone || "",
      designation: p.designation || "",
      department: p.department || "",
      project_id: p.project_id || "",
      role: p.role,
      reporting_manager_id: p.reporting_manager_id || "",
    });
  };

  const saveEdit = async () => {
    if (!editingId || !session?.access_token) return;
    setActionLoading(editingId);

    const res = await fetch("/api/admin/edit-employee", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId: editingId, ...editValues }),
    });

    if (res.ok) {
      setEditingId(null);
      await fetchProfiles();
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to save.", "error");
    }
    setActionLoading(null);
  };

  const handleRoleChange = async (targetUser: HrProfile, newRole: string) => {
    if (targetUser.id === user?.id) {
      showToast("You cannot change your own role.", "error");
      return;
    }
    setActionLoading(targetUser.id);
    const res = await fetch("/api/admin/update-role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ userId: targetUser.id, newRole }),
    });
    if (res.ok) {
      await fetchProfiles();
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to update role.", "error");
    }
    setActionLoading(null);
  };

  // Guard
  if (profile && !["admin", "super_admin"].includes(profile.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <Shield className="w-12 h-12 text-gray-300 mb-4" />
        <h1 className="text-lg font-semibold mb-2">Access Denied</h1>
        <p className="text-sm text-gray-500 text-center mb-4">
          Only administrators can access this page.
        </p>
        <Link href="/dashboard" className="text-primary text-sm font-medium">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const roleOptions = profile?.role === "super_admin"
    ? ["employee", "manager", "admin", "super_admin"]
    : ["employee", "manager", "admin"];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link
          href="/dashboard"
          className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-lg font-semibold text-center flex-1">
          Employee Management
        </h1>
        <Link
          href="/dashboard/admin/employees"
          className="p-2 -mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          title="Add Employee"
        >
          <UserPlus className="w-5 h-5 text-primary" />
        </Link>
      </header>

      {/* Count badges */}
      <div className="px-6 pt-4 flex gap-3 text-xs flex-wrap">
        <span className="px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
          {counts.total} active
        </span>
        <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
          {counts.admins} admins
        </span>
        <span className="px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium">
          {counts.managers} managers
        </span>
        <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
          {counts.employees} employees
        </span>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, designation..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="flex gap-2">
          {/* Project filter (universal users only) */}
          {isUniversal && (
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-sm"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          )}
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "active" | "deactivated" | "all")}
            className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-sm"
          >
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {/* Employee List */}
      <div className="px-6 pb-6">
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading employees...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProfiles.map((p) => {
              const isEditing = editingId === p.id;
              const isDeactivated = !!p.deactivated_at;

              return (
                <div
                  key={p.id}
                  className={`bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 ${
                    isDeactivated ? "opacity-60" : ""
                  }`}
                >
                  {isEditing ? (
                    /* Edit Mode */
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold">Edit Employee</p>
                        <div className="flex gap-1">
                          <button
                            onClick={saveEdit}
                            disabled={actionLoading === p.id}
                            className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
                          >
                            {actionLoading === p.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={editValues.full_name}
                          onChange={(e) => setEditValues((v) => ({ ...v, full_name: e.target.value }))}
                          placeholder="Full Name"
                          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                        />
                        <input
                          value={editValues.phone}
                          onChange={(e) => setEditValues((v) => ({ ...v, phone: e.target.value }))}
                          placeholder="Phone"
                          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                        />
                        <select
                          value={editValues.designation}
                          onChange={(e) => setEditValues((v) => ({ ...v, designation: e.target.value }))}
                          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                        >
                          <option value="">No Designation</option>
                          {designations.map((d) => (
                            <option key={d.id} value={d.name}>{d.name}</option>
                          ))}
                        </select>
                        <select
                          value={editValues.department}
                          onChange={(e) => setEditValues((v) => ({ ...v, department: e.target.value }))}
                          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                        >
                          <option value="">No Department</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.name}>{d.name}</option>
                          ))}
                        </select>
                        <select
                          value={editValues.project_id}
                          onChange={(e) => setEditValues((v) => ({ ...v, project_id: e.target.value }))}
                          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                        >
                          <option value="">No Project</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                        <select
                          value={editValues.role}
                          onChange={(e) => setEditValues((v) => ({ ...v, role: e.target.value }))}
                          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                        >
                          {roleOptions.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <select
                          value={editValues.reporting_manager_id}
                          onChange={(e) => setEditValues((v) => ({ ...v, reporting_manager_id: e.target.value }))}
                          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm col-span-2"
                        >
                          <option value="">No Manager</option>
                          {managers.map((m) => (
                            <option key={m.id} value={m.id}>{m.full_name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {p.full_name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold truncate">{p.full_name}</p>
                            {isDeactivated && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                Deactivated
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {p.designation || "—"} · {p.phone || "—"} · {p.project_id || "—"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Role selector */}
                        <select
                          value={p.role}
                          onChange={(e) => handleRoleChange(p, e.target.value)}
                          disabled={actionLoading === p.id || p.id === user?.id}
                          className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 disabled:opacity-50"
                        >
                          {roleOptions.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>

                        {/* Edit */}
                        <button
                          onClick={() => startEdit(p)}
                          title="Edit"
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-primary"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Reset password */}
                        <button
                          onClick={() => handleResetPassword(p)}
                          disabled={actionLoading === p.id}
                          title="Reset password"
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-primary disabled:opacity-50"
                        >
                          {actionLoading === p.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <KeyRound className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Deactivate / Restore */}
                        {p.id !== user?.id && (
                          <button
                            onClick={() => handleDeactivate(p)}
                            disabled={actionLoading === p.id}
                            title={isDeactivated ? "Restore" : "Deactivate"}
                            className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 ${
                              isDeactivated
                                ? "text-green-500 hover:text-green-600"
                                : "text-gray-400 hover:text-red-500"
                            }`}
                          >
                            {isDeactivated ? (
                              <UserCheck className="w-3.5 h-3.5" />
                            ) : (
                              <UserX className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredProfiles.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">
                No employees found.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
