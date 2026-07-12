"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Save,
  Building2,
  Globe,
  Shield,
  User,
  Trash2,
} from "lucide-react";
import type { CompanyContext, DataRegion } from "@/lib/saudi/types";

const REGION_LABELS: Record<DataRegion, string> = {
  default: "Default (Current Region)",
  bahrain: "Bahrain",
  dubai: "Dubai",
  kuwait: "Kuwait",
  qatar: "Qatar",
};

interface CompanyForm {
  company_name: string;
  trading_name: string;
  cr_number: string;
  cr_expiry_date: string;
  context_type: CompanyContext;
  data_region: DataRegion;
  contact_email: string;
  contact_phone: string;
  city: string;
  country: string;
  address: string;
  is_active: boolean;
  sub_admin_user_id: string | null;
}

export default function EditCompanyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<CompanyForm>({
    company_name: "",
    trading_name: "",
    cr_number: "",
    cr_expiry_date: "",
    context_type: "india",
    data_region: "default",
    contact_email: "",
    contact_phone: "",
    city: "",
    country: "Saudi Arabia",
    address: "",
    is_active: true,
    sub_admin_user_id: null,
  });

  useEffect(() => {
    const fetch = async () => {
      const { data, error: err } = await supabase
        .from("company_registry")
        .select("*")
        .eq("id", id)
        .single();
      if (err) {
        setError(err.message);
      } else if (data) {
        setForm({
          company_name: data.company_name,
          trading_name: data.trading_name || "",
          cr_number: data.cr_number || "",
          cr_expiry_date: data.cr_expiry_date || "",
          context_type: data.context_type as CompanyContext,
          data_region: data.data_region as DataRegion,
          contact_email: data.contact_email || "",
          contact_phone: data.contact_phone || "",
          city: data.city || "",
          country: data.country || "Saudi Arabia",
          address: data.address || "",
          is_active: data.is_active,
          sub_admin_user_id: data.sub_admin_user_id,
        });
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    const { error: err } = await supabase
      .from("company_registry")
      .update({
        company_name: form.company_name,
        trading_name: form.trading_name || null,
        cr_number: form.cr_number || null,
        cr_expiry_date: form.cr_expiry_date || null,
        context_type: form.context_type,
        data_region: form.data_region,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        city: form.city || null,
        country: form.country,
        address: form.address || null,
        is_active: form.is_active,
      })
      .eq("id", id);

    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      setSaved(true);
      router.refresh();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !form.company_name) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <Link href="/dashboard/admin/companies" className="text-primary text-sm mt-2 inline-block">
          Back to companies
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/admin/companies"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {form.company_name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Edit company settings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              form.context_type === "saudi"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            }`}
          >
            <Globe className="w-3 h-3" />
            {form.context_type === "saudi" ? "Saudi" : "India"}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              form.data_region !== "default"
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            <Shield className="w-3 h-3" />
            {form.data_region}
          </span>
        </div>
      </div>

      {saved && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400">
          Company updated successfully
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              <Building2 className="w-4 h-4 inline mr-2" />
              Company Details
            </h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Active
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company Name *
              </label>
              <input
                required
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Trading Name
              </label>
              <input
                value={form.trading_name}
                onChange={(e) => setForm({ ...form, trading_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                CR Number
              </label>
              <input
                value={form.cr_number}
                onChange={(e) => setForm({ ...form, cr_number: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                CR Expiry Date
              </label>
              <input
                type="date"
                value={form.cr_expiry_date}
                onChange={(e) => setForm({ ...form, cr_expiry_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Country
              </label>
              <input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark text-sm"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark p-6 space-y-5">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            <Shield className="w-4 h-4 inline mr-2" />
            Context &amp; Data Residency
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Market Context *
              </label>
              <select
                value={form.context_type}
                onChange={(e) => setForm({ ...form, context_type: e.target.value as CompanyContext })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark text-sm"
              >
                <option value="india">India</option>
                <option value="saudi">Saudi Arabia</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Region *
              </label>
              <select
                value={form.data_region}
                onChange={(e) => setForm({ ...form, data_region: e.target.value as DataRegion })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark text-sm"
              >
                {(Object.entries(REGION_LABELS) as [DataRegion, string][]).map(([v, lbl]) => (
                  <option key={v} value={v}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark p-6 space-y-5">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            <User className="w-4 h-4 inline mr-2" />
            Contact
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <input
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              City
            </label>
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address
            </label>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark text-sm resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex justify-between">
          <button
            type="button"
            onClick={async () => {
              if (!confirm("Deactivate this company? Existing data will be preserved.")) return;
              await supabase
                .from("company_registry")
                .update({ is_active: false })
                .eq("id", id);
              setForm({ ...form, is_active: false });
              if (typeof window !== "undefined") router.refresh();
            }}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
            Deactivate
          </button>
          <div className="flex gap-3">
            <Link
              href="/dashboard/admin/companies"
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
