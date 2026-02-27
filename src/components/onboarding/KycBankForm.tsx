"use client";

import { CreditCard, Building2, Hash, Upload } from "lucide-react";

interface KycBankFormProps {
  data: {
    aadhaar: string;
    pan: string;
    bankName: string;
    accountNo: string;
    ifsc: string;
  };
  onChange: (field: string, value: string) => void;
}

export default function KycBankForm({ data, onChange }: KycBankFormProps) {
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
      <h3 className="text-sm font-semibold mb-5">KYC & Bank Details</h3>
      <div className="space-y-5">
        {/* Aadhaar */}
        <div className="relative">
          <CreditCard className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={data.aadhaar}
            onChange={(e) => onChange("aadhaar", e.target.value)}
            placeholder="Aadhaar Number *"
            className="uds-input pl-10"
            maxLength={12}
          />
        </div>

        {/* PAN */}
        <div className="relative">
          <Hash className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={data.pan}
            onChange={(e) => onChange("pan", e.target.value.toUpperCase())}
            placeholder="PAN Number *"
            className="uds-input pl-10"
            maxLength={10}
          />
        </div>

        {/* Document Upload (not yet available) */}
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col items-center text-center opacity-60">
          <Upload className="w-5 h-5 text-gray-400 mb-2" />
          <p className="text-xs text-gray-400">Document upload coming soon</p>
        </div>

        <hr className="border-gray-100 dark:border-gray-800" />

        {/* Bank Name */}
        <div className="relative">
          <Building2 className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={data.bankName}
            onChange={(e) => onChange("bankName", e.target.value)}
            placeholder="Bank Name *"
            className="uds-input pl-10"
          />
        </div>

        {/* Account Number */}
        <div className="relative">
          <Hash className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={data.accountNo}
            onChange={(e) => onChange("accountNo", e.target.value)}
            placeholder="Account Number *"
            className="uds-input pl-10"
          />
        </div>

        {/* IFSC */}
        <div className="relative">
          <Hash className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={data.ifsc}
            onChange={(e) => onChange("ifsc", e.target.value.toUpperCase())}
            placeholder="IFSC Code *"
            className="uds-input pl-10"
            maxLength={11}
          />
        </div>
      </div>
    </div>
  );
}
