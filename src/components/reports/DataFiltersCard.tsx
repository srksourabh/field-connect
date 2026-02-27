"use client";

import { Filter, ChevronDown } from "lucide-react";

interface DataFiltersCardProps {
  project: string;
  department: string;
  onProjectChange: (val: string) => void;
  onDepartmentChange: (val: string) => void;
}

export default function DataFiltersCard({
  project,
  department,
  onProjectChange,
  onDepartmentChange,
}: DataFiltersCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Filters</h3>
      </div>
      <div className="space-y-4">
        {/* Project */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Project
          </label>
          <div className="relative">
            <select
              value={project}
              onChange={(e) => onProjectChange(e.target.value)}
              className="uds-input pr-10 appearance-none text-sm"
            >
              <option value="">All Projects</option>
              <option value="uds-pos">UDS POS</option>
              <option value="in-house">In-House</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
        {/* Department */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Department
          </label>
          <div className="relative">
            <select
              value={department}
              onChange={(e) => onDepartmentChange(e.target.value)}
              className="uds-input pr-10 appearance-none text-sm"
            >
              <option value="">All Departments</option>
              <option value="engineering">Engineering</option>
              <option value="operations">Operations</option>
              <option value="hr">Human Resources</option>
              <option value="finance">Finance</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
