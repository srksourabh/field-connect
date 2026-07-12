"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldAlert, Clock, ShieldCheck } from "lucide-react";
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
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-forest border-t-transparent rounded-full animate-spin" />
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 font-satoshi">Compliance</h1>
        <p className="text-slate-400 text-sm mt-1">
          Saudi compliance monitoring and document tracking
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-[32px] border border-gold/20 bg-white shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gold" />
            Expiring Documents
          </h2>
          {expiringDocs.length === 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-200">
              <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
              <p className="text-sm text-green-700">No documents expiring in the next 30 days</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expiringDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 border border-amber-200"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800 capitalize">{doc.type}</p>
                    <p className="text-xs text-slate-500">{(doc as unknown as { saudi_employees: { full_name: string } }).saudi_employees?.full_name}</p>
                  </div>
                  <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-3 py-1 rounded-full">
                    {doc.expiry_date}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[32px] border border-gold/20 bg-white shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-gold" />
            Recent Checks
          </h2>
          {checks.length === 0 ? (
            <p className="text-sm text-slate-400">No compliance checks recorded</p>
          ) : (
            <div className="space-y-3">
              {checks.slice(0, 10).map((check) => (
                <div
                  key={check.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">{check.check_type}</p>
                    <p className="text-xs text-slate-400">
                      {(check as unknown as { saudi_payroll_runs: { period_month: string } }).saudi_payroll_runs?.period_month}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    check.status === "passed"
                      ? "bg-green-100 text-green-700"
                      : check.status === "flagged"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
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
