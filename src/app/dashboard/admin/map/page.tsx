"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, Users, UserCheck, TreePalm, UserX, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import AdminLiveMap from "@/components/tracking/AdminLiveMap";
import EmployeeInfoCard from "@/components/tracking/EmployeeInfoCard";
import type { MapEmployee } from "@/components/tracking/AdminLeafletMap";

interface DashboardEmployee extends MapEmployee {
  designation: string | null;
  department: string | null;
  avatar_url: string | null;
  totalHoursToday: number;
  totalDistanceKm: number;
  punchedInSince: string | null;
}

interface Summary {
  total: number;
  present: number;
  onLeave: number;
  absent: number;
}

export default function AdminMapPage() {
  const { profile, session } = useAuth();
  const [employees, setEmployees] = useState<DashboardEmployee[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, present: 0, onLeave: 0, absent: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch("/api/admin/dashboard-map", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setEmployees(data.employees || []);
      setSummary(data.summary || { total: 0, present: 0, onLeave: 0, absent: 0 });
    } catch (err) {
      console.error("Dashboard map fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 120_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Admin guard
  if (profile && !["admin", "super_admin"].includes(profile.role)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Admin access required</p>
      </div>
    );
  }

  const mapEmployees: MapEmployee[] = employees
    .filter((e) => e.lat != null)
    .map((e) => ({
      id: e.id,
      name: e.name,
      phone: e.phone,
      email: e.email,
      lat: e.lat!,
      lng: e.lng!,
      status: e.status,
      trail: e.trail,
    }));

  const selectedEmployee = selectedId
    ? employees.find((e) => e.id === selectedId) || null
    : null;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link
          href="/dashboard/admin"
          className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-lg font-semibold text-center flex-1">Team Map</h1>
        <div className="w-9" />
      </header>

      {/* Summary Stats Bar */}
      <div className="px-4 py-3 bg-white dark:bg-surface-dark border-b border-gray-100 dark:border-gray-800 flex gap-4 overflow-x-auto">
        <StatBadge icon={Users} label="Total" value={summary.total} color="text-primary" />
        <StatBadge icon={UserCheck} label="Present" value={summary.present} color="text-green-600" />
        <StatBadge icon={TreePalm} label="On Leave" value={summary.onLeave} color="text-orange-500" />
        <StatBadge icon={UserX} label="Absent" value={summary.absent} color="text-red-500" />
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-800">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <AdminLiveMap
            employees={mapEmployees}
            onSelectEmployee={(id) => setSelectedId(id)}
          />
        )}
      </div>

      {/* Employee Info Card */}
      {selectedEmployee && (
        <EmployeeInfoCard
          employee={selectedEmployee}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function StatBadge({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 min-w-fit">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-sm font-semibold">{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}
