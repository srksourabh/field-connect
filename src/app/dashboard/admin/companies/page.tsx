"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Building2, Search, Globe, Shield, MoreHorizontal } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CompanyRow {
  id: string;
  company_name: string;
  trading_name: string | null;
  cr_number: string | null;
  context_type: string;
  data_region: string;
  is_active: boolean;
  created_at: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("company_registry")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setCompanies(data as CompanyRow[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = companies.filter(
    (c) =>
      c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.cr_number && c.cr_number.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Companies</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage white-label company onboarding and context settings
          </p>
        </div>
        <Link
          href="/dashboard/admin/companies/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Company
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search companies or CR number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark text-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No companies found</p>
          <p className="text-sm mt-1">
            {search ? "Try a different search term" : "Add your first company to get started"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((company) => (
            <Link
              key={company.id}
              href={`/dashboard/admin/companies/${company.id}`}
              className="block p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {company.company_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {company.trading_name && `${company.trading_name} \u00b7 `}
                      CR: {company.cr_number || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      company.context_type === "saudi"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    {company.context_type === "saudi" ? "Saudi" : "India"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      company.data_region !== "default"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    <Shield className="w-3 h-3" />
                    {company.data_region}
                  </span>
                  {!company.is_active && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      Inactive
                    </span>
                  )}
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
