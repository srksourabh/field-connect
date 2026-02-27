"use client";

import { X, Phone, MessageCircle, MapPin } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";

interface EmployeeDetailSheetProps {
  employee: {
    name: string;
    designation: string;
    department: string;
    status: "online" | "away" | "offline";
    phone?: string;
    email?: string;
    location?: string;
  } | null;
  onClose: () => void;
}

const statusMap = {
  online: { variant: "success" as const, label: "Online" },
  away: { variant: "warning" as const, label: "Away" },
  offline: { variant: "neutral" as const, label: "Offline" },
};

export default function EmployeeDetailSheet({ employee, onClose }: EmployeeDetailSheetProps) {
  if (!employee) return null;

  const statusConfig = statusMap[employee.status];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto">
        <div className="bg-white dark:bg-surface-dark rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] max-h-[60vh] overflow-y-auto">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
          {/* Header */}
          <div className="px-6 pb-4 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-lg font-bold text-indigo-600 dark:text-indigo-400">
                {employee.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{employee.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {employee.designation}
                </p>
                <StatusBadge variant={statusConfig.variant} className="mt-1">
                  {statusConfig.label}
                </StatusBadge>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Department & Info */}
          <div className="px-6 pb-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{employee.department}</p>
              <p className="text-xs text-gray-500">Department</p>
            </div>
          </div>

          {/* Info */}
          <div className="px-6 pb-6 space-y-3">
            {employee.location && (
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4 text-primary" />
                {employee.location}
              </div>
            )}
            {employee.phone && (
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <Phone className="w-4 h-4 text-primary" />
                {employee.phone}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-3">
              <button className="flex-1 uds-btn-primary">
                <Phone className="w-4 h-4" /> Call
              </button>
              <button className="flex-1 uds-btn-secondary">
                <MessageCircle className="w-4 h-4" /> Message
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
