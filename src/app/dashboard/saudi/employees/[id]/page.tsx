"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, FileText } from "lucide-react";
import type { SaudiEmployee, SaudiDocument } from "@/lib/saudi/types";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  on_leave: "bg-amber-100 text-amber-700",
  suspended: "bg-red-100 text-red-700",
  terminated: "bg-gray-100 text-gray-600",
};

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [employee, setEmployee] = useState<SaudiEmployee | null>(null);
  const [documents, setDocuments] = useState<SaudiDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [empRes, docRes] = await Promise.all([
        supabase.from("saudi_employees").select("*").eq("id", id).single(),
        supabase.from("saudi_documents").select("*").eq("employee_id", id).order("expiry_date"),
      ]);
      if (empRes.data) setEmployee(empRes.data);
      if (docRes.data) setDocuments(docRes.data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-forest border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p className="text-lg font-medium text-slate-500">Employee not found</p>
      </div>
    );
  }

  const totalPackage = Number(employee.salary_basic) + Number(employee.salary_housing) + Number(employee.salary_transport);

  return (
    <div className="space-y-8 max-w-4xl">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 font-satoshi">{employee.full_name}</h1>
          <span className={`inline-flex mt-2 px-3 py-1 rounded-full text-xs font-semibold ${statusColors[employee.employment_status]}`}>
            {employee.employment_status.replace("_", " ")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-[32px] border border-gold/20 bg-white shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Compensation</h2>
            <div className="grid grid-cols-3 gap-6">
              <div className="p-4 rounded-2xl bg-forest/5">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Basic</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">SAR {Number(employee.salary_basic).toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-2xl bg-forest/5">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Housing</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">SAR {Number(employee.salary_housing).toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-2xl bg-forest/5">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Transport</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">SAR {Number(employee.salary_transport).toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Total Package</span>
                <span className="text-2xl font-black text-forest">SAR {totalPackage.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-gold/20 bg-white shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Documents</h2>
            {documents.length === 0 ? (
              <p className="text-sm text-slate-400">No documents uploaded</p>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50">
                    <div className="flex items-center gap-4">
                      <FileText className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800 capitalize">{doc.type}</p>
                        <p className="text-xs text-slate-400">{doc.file_name}</p>
                      </div>
                    </div>
                    {doc.expiry_date && (
                      <span className="text-xs font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                        Expires: {doc.expiry_date}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-gold/20 bg-white shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Details</h2>
            <div className="space-y-5">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Nationality</p>
                <p className="text-sm font-semibold text-slate-800 mt-1 capitalize">{employee.nationality}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Hire Date</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">{employee.hire_date}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">GOSI System</p>
                <p className="text-sm font-semibold text-slate-800 mt-1 capitalize">{employee.gosi_system ?? "Not set"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">GOSI Registration</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">{employee.gosi_registration_date ?? "Not registered"}</p>
              </div>
            </div>
          </div>

          {employee.termination_date && (
            <div className="rounded-[32px] border border-red-200 bg-red-50 p-6">
              <h2 className="text-sm font-bold text-red-700 mb-3">Termination</h2>
              <p className="text-sm text-red-600">Terminated on {employee.termination_date}</p>
              {employee.rehire_eligible && (
                <p className="text-xs text-red-500 mt-2">Rehire eligibility: {employee.rehire_eligible}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
