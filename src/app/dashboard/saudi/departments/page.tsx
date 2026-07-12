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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Departments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{departments.length} departments</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Department
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Department name"
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-surface-dark text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
            autoFocus
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Save
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : departments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
          <Building2 className="w-12 h-12 mb-3" />
          <p className="text-lg font-medium">No departments yet</p>
          <p className="text-sm mt-1">Create your first department to organize employees.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="p-4 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-surface-dark"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{dept.name}</p>
                  {dept.parent_department_id && (
                    <p className="text-xs text-gray-500">Sub-department</p>
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
