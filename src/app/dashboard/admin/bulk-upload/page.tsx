// src/app/dashboard/admin/bulk-upload/page.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Download, Upload, AlertTriangle, CheckCircle, XCircle, Loader2, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMasterData } from "@/hooks/useMasterData";
import { showToast } from "@/components/ui/Toast";
import { exportToCsv } from "@/lib/csv-export";
import {
  csvToBulkRows,
  validateRows,
  sortByManagerDependency,
  type BulkRow,
  type ValidationError,
} from "@/lib/bulk-upload";

const SAMPLE_HEADERS = [
  "full_name*", "phone*", "project*", "department*", "designation*",
  "role", "employee_code", "personal_email", "date_of_joining",
  "reporting_manager_phone", "address", "city", "state", "pincode",
  "aadhaar", "pan", "bank_name", "account_no", "ifsc",
  "basic_salary", "hra", "da", "conveyance_allowance",
  "special_allowance", "medical_allowance", "tds_regime", "pf_opted_out", "uan_number",
];

const SAMPLE_ROW = [
  "Ravi Kumar", "9876543210", "Project Alpha", "Engineering", "Software Engineer",
  "employee", "EMP001", "ravi@gmail.com", "2024-01-15",
  "9876543211", "123 MG Road", "Kolkata", "West Bengal", "700001",
  "", "", "", "", "",
  "25000", "10000", "2000", "1600", "5400", "1250", "new", "false", "",
];

type Step = 1 | 2 | 3 | 4;

interface UploadResult {
  phone: string;
  name: string;
  success: boolean;
  error?: string;
}

export default function BulkUploadPage() {
  const { session, profile } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projects = useMasterData("project");

  const [step, setStep] = useState<Step>(1);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [sortedRows, setSortedRows] = useState<BulkRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [cyclePhones, setCyclePhones] = useState<string[]>([]);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isUniversal =
    profile?.role === "super_admin" ||
    (profile?.designation?.toLowerCase().includes("hr") &&
      ["admin", "super_admin"].includes(profile?.role ?? ""));

  if (!isUniversal) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center p-4">
        <div className="uds-card p-6 text-center">
          <p className="text-red-500">Access restricted to HR and super admins.</p>
          <Link href="/dashboard/admin" className="text-primary text-sm mt-2 block">Back to Admin</Link>
        </div>
      </div>
    );
  }

  function handleDownloadSample() {
    exportToCsv("bulk-upload-sample.csv", SAMPLE_HEADERS, [SAMPLE_ROW]);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = csvToBulkRows(text);
      if (parsed.length === 0) {
        showToast("No data rows found in file.", "error");
        return;
      }
      setRows(parsed);
      setStep(2);
      runValidation(parsed);
    };
    reader.readAsText(file, "utf-8");
  }

  function runValidation(parsed: BulkRow[]) {
    const knownProjects = projects.map((p: { name: string }) => p.name);
    const errors = validateRows(parsed, knownProjects);
    setValidationErrors(errors);
  }

  function handleProceedToReview() {
    if (validationErrors.length > 0) return;
    const { sorted, cyclePhones: cycles } = sortByManagerDependency(rows);
    setSortedRows(sorted);
    setCyclePhones(cycles);
    setStep(3);
  }

  async function handleUpload() {
    setUploading(true);
    setUploadProgress(0);
    setUploadResults([]);

    // Upload in batches of 20 to avoid request timeouts
    const BATCH = 20;
    const allResults: UploadResult[] = [];

    for (let i = 0; i < sortedRows.length; i += BATCH) {
      const chunk = sortedRows.slice(i, i + BATCH).map((row) => ({
        full_name: row.full_name,
        phone: row.phone?.replace(/\D/g, "").slice(-10),
        project: row.project,
        department: row.department,
        designation: row.designation,
        role: row.role || "employee",
        employee_code: row.employee_code || undefined,
        personal_email: row.personal_email || undefined,
        date_of_joining: row.date_of_joining || undefined,
        reporting_manager_phone: row.reporting_manager_phone || undefined,
        address: row.address || undefined,
        city: row.city || undefined,
        state: row.state || undefined,
        pincode: row.pincode || undefined,
        aadhaar: row.aadhaar || undefined,
        pan: row.pan || undefined,
        bank_name: row.bank_name || undefined,
        account_no: row.account_no || undefined,
        ifsc: row.ifsc || undefined,
        tds_regime: row.tds_regime || "new",
        pf_opted_out: row.pf_opted_out === "true",
        uan_number: row.uan_number || undefined,
        salary: {
          basic_salary: row.basic_salary ? Number(row.basic_salary) : 0,
          hra: row.hra ? Number(row.hra) : 0,
          da: row.da ? Number(row.da) : 0,
          conveyance_allowance: row.conveyance_allowance ? Number(row.conveyance_allowance) : 0,
          special_allowance: row.special_allowance ? Number(row.special_allowance) : 0,
          medical_allowance: row.medical_allowance ? Number(row.medical_allowance) : 0,
        },
      }));

      const res = await fetch("/api/admin/bulk-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ employees: chunk }),
      });

      if (res.ok) {
        const data = await res.json();
        allResults.push(...(data.results as UploadResult[]));
      } else {
        // Mark all in chunk as failed
        for (const row of chunk) {
          allResults.push({ phone: row.phone ?? "", name: row.full_name, success: false, error: "Network error" });
        }
      }

      setUploadProgress(Math.round(((i + BATCH) / sortedRows.length) * 100));
      setUploadResults([...allResults]);
    }

    setUploading(false);
    setStep(4);
  }

  const projectNames = projects.map((p: { name: string }) => p.name);
  const unknownProjects = Array.from(new Set(rows.map((r) => r.project?.trim()).filter(Boolean))).filter(
    (p) => !projectNames.includes(p ?? "")
  );
  const otherErrors = validationErrors.filter((e) => e.field !== "project");

  const batchManagers = sortedRows.filter((r) => {
    const phone = r.reporting_manager_phone?.replace(/\D/g, "").slice(-10);
    return phone && sortedRows.some((s) => s.phone?.replace(/\D/g, "").slice(-10) === phone);
  });

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-8">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-light-bg dark:bg-dark-bg border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
        <Link href="/dashboard/admin" className="p-1 -ml-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-semibold text-base">Bulk Employee Upload</h1>
        <div className="ml-auto flex gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-gray-300 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 mt-6 space-y-4">

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="uds-card p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Step 1 — Prepare & Upload</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Download the sample CSV, fill it in Excel or Google Sheets, then upload it here.
              Columns marked <span className="text-red-500">*</span> are required.
            </p>
            <button
              onClick={handleDownloadSample}
              className="flex items-center gap-2 text-sm text-primary border border-primary rounded-lg px-4 py-2 hover:bg-primary/5 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Sample CSV
            </button>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
            >
              <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Click to upload CSV file</p>
              <p className="text-xs text-gray-400 mt-1">Max 500 employees per upload</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          </div>
        )}

        {/* Step 2: Validation */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="uds-card p-5">
              <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Step 2 — Validation</h2>
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-sm">{rows.length} employees found in file</span>
              </div>

              {/* Unknown projects block */}
              {unknownProjects.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-3">
                  <div className="flex gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                      Unknown project(s) — upload blocked
                    </p>
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-400 mb-2">
                    These projects are not in master data. Add them first or correct the spelling in your CSV:
                  </p>
                  <ul className="space-y-1">
                    {unknownProjects.map((p) => (
                      <li key={p} className="text-xs font-mono bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded">
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Link href="/dashboard/admin" className="text-xs text-primary mt-3 block">
                    Go to Admin → Organisation tab to add projects
                  </Link>
                </div>
              )}

              {/* Other errors */}
              {otherErrors.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-3">
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2">
                    {otherErrors.length} row error(s) — fix before uploading
                  </p>
                  <ul className="space-y-1 max-h-48 overflow-y-auto">
                    {otherErrors.map((e, i) => (
                      <li key={i} className="text-xs text-yellow-700 dark:text-yellow-300">
                        Row {e.row}: [{e.field}] {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {validationErrors.length === 0 && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  All rows valid
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setStep(1); setRows([]); setValidationErrors([]); }} className="flex-1 uds-btn-secondary py-2.5 text-sm">
                Re-upload
              </button>
              <button
                onClick={handleProceedToReview}
                disabled={validationErrors.length > 0}
                className="flex-1 uds-btn-primary py-2.5 text-sm disabled:opacity-50"
              >
                Review &amp; Connect
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review connections */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="uds-card p-5">
              <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Step 3 — Review Connections</h2>

              {cyclePhones.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    Circular manager dependency detected
                  </p>
                  <p className="text-xs text-red-600 mt-1">Phones involved: {cyclePhones.join(", ")}</p>
                  <p className="text-xs text-red-600 mt-1">Fix the reporting_manager_phone values in your CSV and re-upload.</p>
                </div>
              )}

              {batchManagers.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
                    {batchManagers.length} employee(s) have a reporting manager in this same batch
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-300">
                    They will be uploaded after their managers. Upload order is automatically sorted.
                  </p>
                </div>
              )}

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {sortedRows.length} employees ready to upload in the order shown below.
              </p>

              <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-500">#</th>
                      <th className="text-left px-3 py-2 text-gray-500">Name</th>
                      <th className="text-left px-3 py-2 text-gray-500">Phone</th>
                      <th className="text-left px-3 py-2 text-gray-500">Project</th>
                      <th className="text-left px-3 py-2 text-gray-500">Manager</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {sortedRows.map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 font-medium">{row.full_name}</td>
                        <td className="px-3 py-2 text-gray-500">{row.phone}</td>
                        <td className="px-3 py-2 text-gray-500">{row.project}</td>
                        <td className="px-3 py-2 text-gray-500">
                          {row.reporting_manager_phone
                            ? sortedRows.some(
                                (s) =>
                                  s.phone?.replace(/\D/g, "").slice(-10) ===
                                  row.reporting_manager_phone?.replace(/\D/g, "").slice(-10)
                              )
                              ? <span className="text-blue-500">↑ in batch</span>
                              : row.reporting_manager_phone
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 uds-btn-secondary py-2.5 text-sm">Back</button>
              <button
                onClick={handleUpload}
                disabled={cyclePhones.length > 0}
                className="flex-1 uds-btn-primary py-2.5 text-sm disabled:opacity-50"
              >
                Upload {sortedRows.length} Employees
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="uds-card p-5">
              <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">
                {uploading ? "Uploading…" : "Upload Complete"}
              </h2>

              {uploading && (
                <div className="flex items-center gap-3 mb-4">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500">{uploadProgress}%</span>
                </div>
              )}

              {!uploading && (
                <div className="flex gap-6 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{uploadResults.filter((r) => r.success).length}</p>
                    <p className="text-xs text-gray-500">Created</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-500">{uploadResults.filter((r) => !r.success).length}</p>
                    <p className="text-xs text-gray-500">Failed</p>
                  </div>
                </div>
              )}

              <div className="max-h-64 overflow-y-auto space-y-1">
                {uploadResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1">
                    {r.success
                      ? <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                    <span className="font-medium">{r.name}</span>
                    <span className="text-gray-400">{r.phone}</span>
                    {!r.success && <span className="text-red-500 ml-auto truncate">{r.error}</span>}
                  </div>
                ))}
              </div>
            </div>

            {!uploading && (
              <div className="flex gap-3">
                {uploadResults.some((r) => !r.success) && (
                  <button
                    onClick={() => exportToCsv(
                      "upload-errors.csv",
                      ["name", "phone", "error"],
                      uploadResults.filter((r) => !r.success).map((r) => [r.name, r.phone, r.error ?? ""])
                    )}
                    className="flex-1 uds-btn-secondary py-2.5 text-sm flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Error Report
                  </button>
                )}
                <button onClick={() => router.push("/dashboard/admin")} className="flex-1 uds-btn-primary py-2.5 text-sm">
                  Done
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
