"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Users, UserPlus, FolderKanban, Building2, Briefcase, ShieldCheck, CalendarDays, Bell, Link2, FileBarChart, FileText, Upload, Loader2, ExternalLink, Trash2, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { showToast } from "@/components/ui/Toast";
import { showConfirm } from "@/components/ui/Dialog";

const sections = [
  { icon: Users, label: "Employees", description: "Manage all employees", href: "/dashboard/admin", color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" },
  { icon: UserPlus, label: "Add Employee", description: "Register new employee", href: "/dashboard/admin/employees", color: "text-green-500 bg-green-50 dark:bg-green-900/20" },
  { icon: FolderKanban, label: "Projects", description: "Manage projects", href: "/dashboard/organisation/projects", color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" },
  { icon: Building2, label: "Departments", description: "Manage departments", href: "/dashboard/organisation/departments", color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20" },
  { icon: Briefcase, label: "Designations", description: "Manage designations", href: "/dashboard/organisation/designations", color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20" },
  { icon: ShieldCheck, label: "Leave Policies", description: "Manage leave policies", href: "/dashboard/organisation/leave-policies", color: "text-teal-500 bg-teal-50 dark:bg-teal-900/20" },
  { icon: CalendarDays, label: "Leave Allotment", description: "Allot leave balances", href: "/dashboard/admin/leaves", color: "text-rose-500 bg-rose-50 dark:bg-rose-900/20" },
  { icon: Bell, label: "Notifications", description: "Broadcast notifications", href: "/dashboard/admin/notifications", color: "text-orange-500 bg-orange-50 dark:bg-orange-900/20" },
  { icon: Link2, label: "Onboarding", description: "Generate onboarding links", href: "/dashboard/onboarding", color: "text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20" },
  { icon: FileBarChart, label: "Reports", description: "Generate reports", href: "/dashboard/reports", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" },
  { icon: MessageSquare, label: "HR Inbox", description: "View employee messages", href: "/dashboard/organisation/hr-inbox", color: "text-pink-500 bg-pink-50 dark:bg-pink-900/20" },
];

export default function OrganisationPage() {
  const { profile, session } = useAuth();

  const isUniversal =
    profile?.role === "super_admin" ||
    (profile?.designation?.toLowerCase().includes("hr") &&
      ["admin", "super_admin"].includes(profile?.role || ""));

  if (profile && !isUniversal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <Building2 className="w-12 h-12 text-gray-300 mb-4" />
        <h1 className="text-lg font-semibold mb-2">Access Denied</h1>
        <p className="text-sm text-gray-500 text-center mb-4">
          Only super admins and HR can access organisation management.
        </p>
        <Link href="/dashboard" className="text-primary text-sm font-medium">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link
          href="/dashboard/profile"
          className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-lg font-semibold text-center flex-1">Manage Organisation</h1>
        <div className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-6 space-y-2">
        {sections.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center justify-between p-4 bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-medium block">{item.label}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{item.description}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
        ))}

        {/* HR Policy Upload */}
        <div className="pt-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Company Documents</p>
          <HrPolicyCard accessToken={session?.access_token} />
        </div>
      </div>
    </div>
  );
}

function HrPolicyCard({ accessToken }: { accessToken?: string }) {
  const [policyUrl, setPolicyUrl] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPolicy = useCallback(async () => {
    if (!accessToken) return;
    const res = await fetch("/api/admin/hr-policy", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      setPolicyUrl(data.url);
      setUpdatedAt(data.updatedAt);
    }
    setLoading(false);
  }, [accessToken]);

  useEffect(() => {
    fetchPolicy();
  }, [fetchPolicy]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;

    if (file.type !== "application/pdf") {
      showToast("Only PDF files are allowed", "error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("File must be under 10 MB", "error");
      return;
    }

    setUploading(true);
    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/admin/hr-policy", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });

    if (res.ok) {
      const data = await res.json();
      setPolicyUrl(data.url);
      setUpdatedAt(new Date().toISOString());
      showToast("HR policy uploaded successfully", "success");
    } else {
      const data = await res.json();
      showToast(data.error || "Upload failed", "error");
    }
    setUploading(false);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemove = async () => {
    if (!accessToken) return;
    const confirmed = await showConfirm("Remove HR Policy", "Remove the current HR policy document? Employees will no longer see it on their dashboard.");
    if (!confirmed) return;

    const res = await fetch("/api/admin/hr-policy", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      setPolicyUrl(null);
      setUpdatedAt(null);
      showToast("HR policy removed", "success");
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          <span className="text-sm text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-red-500 bg-red-50 dark:bg-red-900/20">
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">HR Policy Document</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {policyUrl
              ? `Uploaded ${updatedAt ? new Date(updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : ""}`
              : "No document uploaded yet"
            }
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {policyUrl && (
          <>
            <a
              href={policyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View
            </a>
            <button
              onClick={handleRemove}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          </>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {uploading ? "Uploading..." : policyUrl ? "Replace" : "Upload PDF"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleUpload}
          className="hidden"
        />
      </div>
    </div>
  );
}
