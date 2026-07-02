"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Save, Loader2, Building2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { showToast } from "@/components/ui/Toast";

const FIELDS = [
  { key: "company_full_name", label: "Company Full Name", placeholder: "Field Connect powered by UDS" },
  { key: "company_address",   label: "Registered Address",  placeholder: "EC73, 1442 Rajdanga Main Road, Kolkata..." },
  { key: "company_pf_no",     label: "PF Registration No.", placeholder: "WBCAL0123456789" },
  { key: "company_esic_code", label: "ESIC Employer Code",  placeholder: "31000012345678901" },
];

export default function CompanySettingsPage() {
  const { session, profile } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const hasAccess = profile?.role === "super_admin" ||
    (profile?.designation?.toLowerCase().includes("hr") &&
      ["admin", "super_admin"].includes(profile?.role || ""));

  useEffect(() => {
    async function fetchSettings() {
      if (!session?.access_token) return;
      const res = await fetch("/api/admin/company-settings", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setValues(data.settings || {});
      }
      setLoading(false);
    }
    fetchSettings();
  }, [session]);

  const handleSave = async () => {
    if (!session?.access_token) return;
    setSaving(true);
    const res = await fetch("/api/admin/company-settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      showToast("Company settings saved", "success");
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
        <p className="text-sm text-gray-500">Only super admins and HR can manage company settings.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link href="/dashboard/admin/payroll" className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-lg font-semibold text-center flex-1">Company Settings</h1>
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
            <div className="flex items-center gap-2 px-1">
              <Building2 className="w-4 h-4 text-gray-400" />
              <p className="text-xs text-gray-500">These details appear on all payslip PDFs.</p>
            </div>

            {/* Logo preview */}
            <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brands/uds-logo.jpg" alt="Company Logo" className="h-12 w-auto object-contain rounded" />
              <div>
                <p className="text-sm font-medium">Logo</p>
                <p className="text-xs text-gray-400">Stored at /brands/uds-logo.jpg</p>
              </div>
            </div>

            {FIELDS.map((f) => (
              <div key={f.key} className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-100 dark:border-gray-700/50">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">{f.label}</label>
                <input
                  type="text"
                  value={values[f.key] || ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            ))}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
