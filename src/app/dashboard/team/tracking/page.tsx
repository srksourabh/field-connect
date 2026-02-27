"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import LiveTrackingMap from "@/components/tracking/LiveTrackingMap";
import type { TrackedEmployee } from "@/components/tracking/LiveTrackingMap";
import { useAuth } from "@/lib/auth";

interface ApiEmployee {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  lat: number | null;
  lng: number | null;
  status: string;
  lastSeen: string;
  punchedIn?: boolean;
  trail?: { lat: number; lng: number }[];
}

export default function TrackingPage() {
  const { session, profile } = useAuth();
  const [employees, setEmployees] = useState<TrackedEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    const fetchLocations = async () => {
      try {
        const res = await fetch("/api/admin/team-locations", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const mapped: TrackedEmployee[] = (data.employees || [])
          .filter((e: ApiEmployee) => e.lat != null)
          .map((e: ApiEmployee) => ({
            id: e.id,
            name: e.name,
            phone: e.phone,
            email: e.email,
            lat: e.lat!,
            lng: e.lng!,
            status: e.status as "online" | "away" | "offline",
            punchedIn: e.punchedIn ?? false,
            trail: e.trail || [],
          }));
        setEmployees(mapped);
      } catch (err) {
        console.error("Failed to fetch team locations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
    // Refresh every 2 minutes, pause when tab is hidden
    let interval = setInterval(fetchLocations, 120_000);
    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        fetchLocations();
        interval = setInterval(fetchLocations, 120_000);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [session?.access_token]);

  // Role guard: only managers and above can access tracking
  if (profile && !["manager", "admin", "super_admin"].includes(profile.role)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Access denied</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link
          href="/dashboard/team"
          className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-lg font-semibold text-center flex-1">
          Live Tracking
        </h1>
        <div className="w-9" />
      </header>

      {/* Map */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-800">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <LiveTrackingMap employees={employees} />
        )}
      </div>

      {/* Bottom Sheet - Employee List */}
      <div className="bg-white dark:bg-surface-dark rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] max-h-[40vh] overflow-y-auto z-10 relative -mt-6">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Team Members</h3>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" /> Punched In
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400" /> Not Punched In
              </span>
            </div>
          </div>
          {employees.length === 0 && !loading ? (
            <p className="text-sm text-gray-500 text-center py-4">No team members with location data</p>
          ) : (
            <div className="space-y-2">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700/50 hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {emp.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-surface-dark ${
                          emp.punchedIn ? "bg-green-500" : "bg-gray-400"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{emp.name}</p>
                      <p className="text-xs text-gray-500">
                        {emp.trail.length > 0 ? `${emp.trail.length} GPS points` : "No trail data"}
                        {emp.phone && ` · ${emp.phone}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
