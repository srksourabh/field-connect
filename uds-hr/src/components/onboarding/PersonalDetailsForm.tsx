"use client";

import { User, Mail, Phone, Calendar, Droplets } from "lucide-react";

interface PersonalDetailsFormProps {
  data: {
    fullName: string;
    email: string;
    phone: string;
    dob: string;
    bloodGroup: string;
    address: string;
  };
  onChange: (field: string, value: string) => void;
}

export default function PersonalDetailsForm({ data, onChange }: PersonalDetailsFormProps) {
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
      <h3 className="text-sm font-semibold mb-5">Personal Details</h3>
      <div className="space-y-5">
        {/* Full Name */}
        <div className="relative">
          <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={data.fullName}
            onChange={(e) => onChange("fullName", e.target.value)}
            placeholder="Full Name *"
            required
            className="uds-input pl-10"
          />
        </div>

        {/* Email */}
        <div className="relative">
          <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="email"
            value={data.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="Email Address *"
            required
            className="uds-input pl-10"
          />
        </div>

        {/* Phone */}
        <div className="flex gap-2">
          <div className="shrink-0 flex items-center px-3 bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-500">
            +91
          </div>
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              placeholder="Phone Number *"
              required
              className="uds-input pl-10"
            />
          </div>
        </div>

        {/* DOB + Blood Group */}
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={data.dob}
              onChange={(e) => onChange("dob", e.target.value)}
              className="uds-input pl-10 text-sm dark:[color-scheme:dark]"
            />
          </div>
          <div className="relative">
            <Droplets className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
            <select
              value={data.bloodGroup}
              onChange={(e) => onChange("bloodGroup", e.target.value)}
              className="uds-input pl-10 appearance-none text-sm"
            >
              <option value="">Blood Group</option>
              <option>A+</option>
              <option>A-</option>
              <option>B+</option>
              <option>B-</option>
              <option>O+</option>
              <option>O-</option>
              <option>AB+</option>
              <option>AB-</option>
            </select>
          </div>
        </div>

        {/* Address */}
        <div>
          <textarea
            value={data.address}
            onChange={(e) => onChange("address", e.target.value)}
            placeholder="Residential Address"
            rows={3}
            className="uds-input resize-none"
          />
        </div>
      </div>
    </div>
  );
}
