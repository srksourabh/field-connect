"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Building2, Plus } from "lucide-react";
import type { SaudiDepartment } from "@/lib/saudi/types";

export default function SaudiDepartmentsPage() {
  const [departments, setDepartments] = useState<SaudiDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    loadDepartments();
  }, []);

  async function loadDepartments() {
    const { data } = await supabase.from("saudi_departments").select("*").order("name");
    if (data) setDepartments(data);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    await supabase.from("saudi_departments").insert({ name: name.trim() });
    setName("");
    setShowForm(false);
    loadDepartments();
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 font-satoshi">Departments</h1>
          <p className="text-slate-400 text-sm mt-1">{departments.length} departments</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 bg-forest text-white rounded-full px-6 py-2.5 font-medium hover:bg-forest-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Department
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="flex gap-3 max-w-md">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Department name"
            className="flex-1 px-5 py-3 rounded-full border border-gold/20 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-gold/30"
            autoFocus
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-full bg-forest text-white text-sm font-medium hover:bg-forest-dark transition-colors"
          >
            Save
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-forest border-t-transparent rounded-full animate-spin" />
        </div>
      ) : departments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Building2 className="w-14 h-14 mb-4 opacity-40" />
          <p className="text-lg font-medium text-slate-500">No departments yet</p>
          <p className="text-sm mt-1">Create your first department to organize employees.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="rounded-[32px] border border-gold/20 bg-white shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-forest/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-forest" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-lg">{dept.name}</p>
                  {dept.parent_department_id && (
                    <p className="text-xs text-slate-400">Sub-department</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
