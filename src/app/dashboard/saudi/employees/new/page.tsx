"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft } from "lucide-react";
import type { SaudiDepartment } from "@/lib/saudi/types";

export default function NewEmployeePage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<SaudiDepartment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    nationality: "saudi",
    employment_status: "active",
    hire_date: "",
    gosi_system: "new",
    salary_basic: "",
    salary_housing: "0",
    salary_transport: "0",
    department_id: "",
    manager_employee_id: "",
    iqama_number_enc: "",
    passport_number_enc: "",
    bank_iban_enc: "",
  });

  useEffect(() => {
    supabase
      .from("saudi_departments")
      .select("*")
      .order("name")
      .then(({ data }) => {
        if (data) setDepartments(data);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.from("saudi_employees").insert({
      full_name: form.full_name,
      nationality: form.nationality,
      employment_status: form.employment_status,
      hire_date: form.hire_date,
      gosi_system: form.gosi_system,
      salary_basic: parseFloat(form.salary_basic),
      salary_housing: parseFloat(form.salary_housing),
      salary_transport: parseFloat(form.salary_transport),
      department_id: form.department_id || null,
      iqama_number_enc: form.iqama_number_enc || null,
      passport_number_enc: form.passport_number_enc || null,
      bank_iban_enc: form.bank_iban_enc || null,
    });

    setSubmitting(false);

    if (!error) {
      router.push("/dashboard/saudi/employees");
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div>
        <h1 className="text-3xl font-bold text-slate-800 font-satoshi">New Employee</h1>
        <p className="text-slate-400 text-sm mt-1">Add a new employee to the Saudi module</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-[32px] border border-gold/20 bg-white shadow-sm p-6 space-y-5">
          <h2 className="text-xl font-bold text-slate-800">Personal Information</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-5 py-3 rounded-full border border-gold/20 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-gold/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nationality</label>
              <select
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                className="w-full px-5 py-3 rounded-full border border-gold/20 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold/30"
              >
                <option value="saudi">Saudi</option>
                <option value="expat">Expat</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">GOSI System</label>
              <select
                value={form.gosi_system}
                onChange={(e) => setForm({ ...form, gosi_system: e.target.value })}
                className="w-full px-5 py-3 rounded-full border border-gold/20 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold/30"
              >
                <option value="new">New</option>
                <option value="old">Old</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Hire Date</label>
              <input
                type="date"
                required
                value={form.hire_date}
                onChange={(e) => setForm({ ...form, hire_date: e.target.value })}
                className="w-full px-5 py-3 rounded-full border border-gold/20 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Department</label>
              <select
                value={form.department_id}
                onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                className="w-full px-5 py-3 rounded-full border border-gold/20 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold/30"
              >
                <option value="">No department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-gold/20 bg-white shadow-sm p-6 space-y-5">
          <h2 className="text-xl font-bold text-slate-800">Salary</h2>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Basic (SAR)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.salary_basic}
                onChange={(e) => setForm({ ...form, salary_basic: e.target.value })}
                className="w-full px-5 py-3 rounded-full border border-gold/20 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Housing</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.salary_housing}
                onChange={(e) => setForm({ ...form, salary_housing: e.target.value })}
                className="w-full px-5 py-3 rounded-full border border-gold/20 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Transport</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.salary_transport}
                onChange={(e) => setForm({ ...form, salary_transport: e.target.value })}
                className="w-full px-5 py-3 rounded-full border border-gold/20 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold/30"
              />
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-gold/20 bg-white shadow-sm p-6 space-y-5">
          <h2 className="text-xl font-bold text-slate-800">Saudi Compliance</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">IQAMA Number</label>
              <input
                type="text"
                value={form.iqama_number_enc}
                onChange={(e) => setForm({ ...form, iqama_number_enc: e.target.value })}
                className="w-full px-5 py-3 rounded-full border border-gold/20 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Passport Number</label>
              <input
                type="text"
                value={form.passport_number_enc}
                onChange={(e) => setForm({ ...form, passport_number_enc: e.target.value })}
                className="w-full px-5 py-3 rounded-full border border-gold/20 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Bank IBAN</label>
            <input
              type="text"
              value={form.bank_iban_enc}
              onChange={(e) => setForm({ ...form, bank_iban_enc: e.target.value })}
              className="w-full px-5 py-3 rounded-full border border-gold/20 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold/30"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 rounded-full bg-forest text-white text-sm font-medium hover:bg-forest-dark disabled:opacity-50 transition-colors"
          >
            {submitting ? "Saving..." : "Create Employee"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-8 py-3 rounded-full border border-gold/20 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
