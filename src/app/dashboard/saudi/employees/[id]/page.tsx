"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, FileText } from "lucide-react";
import type { SaudiEmployee, SaudiDocument } from "@/lib/saudi/types";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  on_leave: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  suspended: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  terminated: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
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
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Employee not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{employee.full_name}</h1>
          <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[employee.employment_status]}`}>
            {employee.employment_status.replace("_", " ")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-surface-dark">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Compensation</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500">Basic</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">SAR {Number(employee.salary_basic).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Housing</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">SAR {Number(employee.salary_housing).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Transport</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">SAR {Number(employee.salary_transport).toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Package</span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  SAR {(Number(employee.salary_basic) + Number(employee.salary_housing) + Number(employee.salary_transport)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-surface-dark">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Documents</h2>
            {documents.length === 0 ? (
              <p className="text-sm text-gray-400">No documents uploaded</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{doc.type}</p>
                        <p className="text-xs text-gray-500">{doc.file_name}</p>
                      </div>
                    </div>
                    {doc.expiry_date && (
                      <span className="text-xs text-gray-500">Expires: {doc.expiry_date}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-surface-dark">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Details</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Nationality</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 capitalize">{employee.nationality}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Hire Date</p>
                <p className="text-sm text-gray-900 dark:text-gray-100">{employee.hire_date}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">GOSI System</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 capitalize">{employee.gosi_system ?? "Not set"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">GOSI Registration</p>
                <p className="text-sm text-gray-900 dark:text-gray-100">{employee.gosi_registration_date ?? "Not registered"}</p>
              </div>
            </div>
          </div>

          {employee.termination_date && (
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <h2 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Termination</h2>
              <p className="text-sm text-red-600 dark:text-red-300">
                Terminated on {employee.termination_date}
              </p>
              {employee.rehire_eligible && (
                <p className="text-xs text-red-500 mt-1">
                  Rehire eligibility: {employee.rehire_eligible}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
