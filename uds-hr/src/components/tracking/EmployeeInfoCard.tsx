"use client";

import { X, Phone, Mail, Clock, Navigation } from "lucide-react";

interface EmployeeInfo {
  id: string;
  name: string;
  designation: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  status: string;
  totalHoursToday: number;
  totalDistanceKm: number;
  punchedInSince: string | null;
}

interface EmployeeInfoCardProps {
  employee: EmployeeInfo | null;
  onClose: () => void;
}

export default function EmployeeInfoCard({ employee, onClose }: EmployeeInfoCardProps) {
  if (!employee) return null;

  const initials = employee.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const statusColors: Record<string, string> = {
    online: "bg-green-500",
    away: "bg-yellow-500",
    on_leave: "bg-orange-500",
    offline: "bg-gray-500",
  };

  const statusLabels: Record<string, string> = {
    online: "Online",
    away: "Away",
    on_leave: "On Leave",
    offline: "Offline",
  };

  const timeSincePunchIn = employee.punchedInSince
    ? (() => {
        const mins = Math.floor((Date.now() - new Date(employee.punchedInSince).getTime()) / 60000);
        if (mins < 60) return `${mins}m`;
        return `${Math.floor(mins / 60)}h ${mins % 60}m`;
      })()
    : null;

  return (
    <>
      {/* Mobile: slide-up card */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[1001] animate-slide-up">
        <div className="bg-white dark:bg-surface-dark rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.15)] p-5">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                  {initials}
                </div>
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-surface-dark ${statusColors[employee.status] || "bg-gray-500"}`} />
              </div>
              <div>
                <h3 className="font-semibold">{employee.name}</h3>
                <p className="text-xs text-gray-500">{employee.designation || employee.department || "--"}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span className={`w-2 h-2 rounded-full ${statusColors[employee.status]}`} />
            <span className="text-xs font-medium">{statusLabels[employee.status] || "Unknown"}</span>
            {timeSincePunchIn && (
              <span className="text-xs text-gray-500 ml-2">
                <Clock className="w-3 h-3 inline mr-0.5" />
                Punched in {timeSincePunchIn} ago
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
              <Navigation className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
              <p className="text-lg font-bold">{employee.totalDistanceKm}</p>
              <p className="text-xs text-gray-500">km today</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
              <Clock className="w-4 h-4 mx-auto mb-1 text-purple-500" />
              <p className="text-lg font-bold">{employee.totalHoursToday}h</p>
              <p className="text-xs text-gray-500">hours today</p>
            </div>
          </div>

          <div className="flex gap-3">
            {employee.phone && (
              <a
                href={`tel:${employee.phone}`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call
              </a>
            )}
            {employee.email && (
              <a
                href={`mailto:${employee.email}`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Email
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Desktop: side panel */}
      <div className="hidden lg:block fixed top-16 right-0 w-80 h-[calc(100vh-4rem)] z-[1001] bg-white dark:bg-surface-dark border-l border-gray-200 dark:border-gray-700 shadow-xl overflow-y-auto">
        <div className="p-5">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-semibold text-lg">{employee.name}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                {initials}
              </div>
              <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-surface-dark ${statusColors[employee.status]}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{employee.designation || "--"}</p>
              <p className="text-xs text-gray-400">{employee.department || "--"}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className={`w-2 h-2 rounded-full ${statusColors[employee.status]}`} />
                <span className="text-xs font-medium">{statusLabels[employee.status]}</span>
              </div>
            </div>
          </div>

          {timeSincePunchIn && (
            <p className="text-xs text-gray-500 mb-4">
              <Clock className="w-3 h-3 inline mr-1" />
              Punched in {timeSincePunchIn} ago
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
              <Navigation className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
              <p className="text-lg font-bold">{employee.totalDistanceKm}</p>
              <p className="text-xs text-gray-500">km today</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
              <Clock className="w-4 h-4 mx-auto mb-1 text-purple-500" />
              <p className="text-lg font-bold">{employee.totalHoursToday}h</p>
              <p className="text-xs text-gray-500">hours today</p>
            </div>
          </div>

          <div className="space-y-3">
            {employee.phone && (
              <a
                href={`tel:${employee.phone}`}
                className="flex items-center gap-3 w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Phone className="w-4 h-4 text-green-500" />
                <span className="text-sm">{employee.phone}</span>
              </a>
            )}
            {employee.email && (
              <a
                href={`mailto:${employee.email}`}
                className="flex items-center gap-3 w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-sm">{employee.email}</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
