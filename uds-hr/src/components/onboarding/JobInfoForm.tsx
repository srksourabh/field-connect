"use client";

import { Briefcase, Building, Users, Calendar, ChevronDown } from "lucide-react";

interface JobInfoFormProps {
  data: {
    designation: string;
    department: string;
    reportingManager: string;
    joiningDate: string;
    role: string;
  };
  onChange: (field: string, value: string) => void;
}

export default function JobInfoForm({ data, onChange }: JobInfoFormProps) {
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
      <h3 className="text-sm font-semibold mb-5">Job Information</h3>
      <div className="space-y-5">
        {/* Designation */}
        <div className="relative">
          <Briefcase className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={data.designation}
            onChange={(e) => onChange("designation", e.target.value)}
            placeholder="Designation *"
            required
            className="uds-input pl-10"
          />
        </div>

        {/* Department */}
        <div className="relative">
          <Building className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <select
            value={data.department}
            onChange={(e) => onChange("department", e.target.value)}
            required
            className="uds-input pl-10 pr-10 appearance-none"
          >
            <option value="">Select Department *</option>
            <option value="engineering">Engineering</option>
            <option value="operations">Operations</option>
            <option value="hr">Human Resources</option>
            <option value="finance">Finance</option>
            <option value="sales">Sales</option>
          </select>
          <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Reporting Manager */}
        <div className="relative">
          <Users className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={data.reportingManager}
            onChange={(e) => onChange("reportingManager", e.target.value)}
            placeholder="Reporting Manager"
            className="uds-input pl-10"
          />
        </div>

        {/* Joining Date */}
        <div className="relative">
          <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={data.joiningDate}
            onChange={(e) => onChange("joiningDate", e.target.value)}
            className="uds-input pl-10 dark:[color-scheme:dark]"
          />
        </div>

        {/* Role */}
        <div className="relative">
          <Briefcase className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <select
            value={data.role}
            onChange={(e) => onChange("role", e.target.value)}
            className="uds-input pl-10 pr-10 appearance-none"
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
