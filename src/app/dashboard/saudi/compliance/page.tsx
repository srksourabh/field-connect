"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldAlert, Clock } from "lucide-react";
import type { SaudiDocument, SaudiComplianceCheck } from "@/lib/saudi/types";

export default function SaudiCompliancePage() {
  const [documents, setDocuments] = useState<SaudiDocument[]>([]);
  const [checks, setChecks] = useState<SaudiComplianceCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [docRes, checkRes] = await Promise.all([
        supabase
          .from("saudi_documents")
          .select("*, saudi_employees(full_name)")
          .not("expiry_date", "is", null)
          .order("expiry_date", { ascending: true }),
        supabase
          .from("saudi_compliance_checks")
          .select("*, saudi_payroll_runs(period_month)")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (docRes.data) setDocuments(docRes.data);
      if (checkRes.data) setChecks(checkRes.data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const expiringDocs = documents.filter((d) => {
    if (!d.expiry_date) return false;
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    return new Date(d.expiry_date) <= thirtyDays;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Compliance</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Saudi compliance monitoring and document tracking
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-surface-dark">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Expiring Documents
          </h2>
          {expiringDocs.length === 0 ? (
            <p className="text-sm text-gray-400">No documents expiring in the next 30 days</p>
          ) : (
            <div className="space-y-2">
              {expiringDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{doc.type}</p>
                    <p className="text-xs text-gray-500">{(doc as unknown as { saudi_employees: { full_name: string } }).saudi_employees?.full_name}</p>
                  </div>
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    {doc.expiry_date}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-surface-dark">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            Recent Checks
          </h2>
          {checks.length === 0 ? (
            <p className="text-sm text-gray-400">No compliance checks recorded</p>
          ) : (
            <div className="space-y-2">
              {checks.slice(0, 10).map((check) => (
                <div
                  key={check.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                >
                  <div>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{check.check_type}</p>
                    <p className="text-xs text-gray-500">
                      {(check as unknown as { saudi_payroll_runs: { period_month: string } }).saudi_payroll_runs?.period_month}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    check.status === "passed"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : check.status === "flagged"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}>
                    {check.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
