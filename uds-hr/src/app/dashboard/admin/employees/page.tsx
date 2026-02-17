"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, UserPlus, Loader2, Check } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface ManagerOption {
  id: string;
  full_name: string;
}

export default function AddEmployeePage() {
  const { profile, session } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const email = phone ? `${phone.replace(/\D/g, "")}@uds.hr` : "";
  const [designation, setDesignation] = useState("Field Engineer");
  const [department, setDepartment] = useState("");
  const [project, setProject] = useState("in-house");
  const [role, setRole] = useState("employee");
  const [reportingManagerId, setReportingManagerId] = useState("");
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  if (profile && !["admin", "super_admin"].includes(profile.role)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Admin access required</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token || !fullName || !phone) return;

    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/add-employee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ fullName, email, phone, designation, department, project, role, reportingManagerId: reportingManagerId || null }),
      });
      const data = await res.json();

      if (res.ok) {
        setResult({ type: "success", text: data.message });
        setFullName("");
        setPhone("");
        setDesignation("Field Engineer");
        setDepartment("");
        setProject("in-house");
        setRole("employee");
        setReportingManagerId("");
      } else {
        setResult({ type: "error", text: data.error || "Failed to add employee." });
      }
    } catch {
      setResult({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link
          href="/dashboard/profile"
          className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-lg font-semibold text-center flex-1">Add Employee</h1>
        <div className="w-9" />
      </header>

      <form onSubmit={handleSubmit} className="px-5 py-6 space-y-4 max-w-lg mx-auto">
        {result && (
          <div
            className={`p-3 rounded-xl text-sm ${
              result.type === "success"
                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800"
                : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800"
            }`}
          >
            {result.text}
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Full Name *</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="e.g. Suman Mukherjee"
            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Phone *</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="e.g. 8210331886"
            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {email && (
            <p className="text-xs text-gray-400 mt-1">Login email: {email}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Designation</label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. HR"
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Department</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Human Resources"
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Project</label>
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="in-house">In-House</option>
              <option value="uds-pos">UDS POS</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Reporting Manager</label>
          <select
            value={reportingManagerId}
            onChange={(e) => setReportingManagerId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">None</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        </div>

        <p className="text-xs text-gray-400">
          Default password: first 4 letters of name (lowercase) + last 4 digits of phone
        </p>

        <button
          type="submit"
          disabled={submitting || !fullName || !phone}
          className="w-full py-3.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : result?.type === "success" ? (
            <Check className="w-4 h-4" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          {submitting ? "Adding..." : "Add Employee"}
        </button>
      </form>
    </div>
  );
}
