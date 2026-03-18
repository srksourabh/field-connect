"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { ChevronLeft, Loader2, Search, RefreshCw, Filter } from "lucide-react";
import Link from "next/link";
import LiveTrackingMap from "@/components/tracking/LiveTrackingMap";
import type { TrackedEmployee } from "@/components/tracking/LiveTrackingMap";
import { useAuth } from "@/lib/auth";
import { logError } from "@/lib/utils";

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

type PunchFilter = "all" | "punched_in" | "not_punched_in";

export default function TrackingPage() {
  const { session, profile } = useAuth();
  const [allEmployees, setAllEmployees] = useState<TrackedEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [punchFilter, setPunchFilter] = useState<PunchFilter>("all");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const fetchLocations = useCallback(async (showRefresh = false) => {
    if (!session?.access_token) return;
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/team-locations", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const mapped: TrackedEmployee[] = (data.employees || [])
        .map((e: ApiEmployee) => ({
          id: e.id,
          name: e.name,
          phone: e.phone,
          email: e.email,
          lat: e.lat ?? 0,
          lng: e.lng ?? 0,
          status: e.status as "online" | "away" | "offline",
          punchedIn: e.punchedIn ?? false,
          trail: e.trail || [],
          lastSeen: e.lastSeen,
        }));
      setAllEmployees(mapped);
    } catch (err) {
      logError("Failed to fetch team locations:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    fetchLocations();
    let interval = setInterval(() => fetchLocations(), 120_000);
    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        fetchLocations();
        interval = setInterval(() => fetchLocations(), 120_000);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchLocations, session?.access_token]);

  // Filtered employees for map and list
  const filteredEmployees = useMemo(() => {
    let result = allEmployees;

    // Filter by punch status
    if (punchFilter === "punched_in") {
      result = result.filter((e) => e.punchedIn);
    } else if (punchFilter === "not_punched_in") {
      result = result.filter((e) => !e.punchedIn);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) =>
        e.name.toLowerCase().includes(q) ||
        (e.phone && e.phone.includes(q))
      );
    }

    return result;
  }, [allEmployees, punchFilter, searchQuery]);

  // Only show employees with GPS data on map
  const mapEmployees = useMemo(() =>
    filteredEmployees.filter((e) => e.lat !== 0 && e.lng !== 0),
    [filteredEmployees]
  );

  const handleSelectEmployee = (id: string) => {
    setSelectedEmployeeId(id === selectedEmployeeId ? null : id);
  };

  const punchedInCount = allEmployees.filter((e) => e.punchedIn).length;
  const totalCount = allEmployees.length;

  // Role guard
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
        <button
          onClick={() => fetchLocations(true)}
          disabled={refreshing}
          className="p-2 -mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </header>

      {/* Filters Bar */}
      <div className="px-4 py-3 bg-white/80 dark:bg-[#151f2b]/80 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 space-y-2 z-10">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          {(["all", "punched_in", "not_punched_in"] as PunchFilter[]).map((filter) => {
            const labels: Record<PunchFilter, string> = {
              all: `All (${totalCount})`,
              punched_in: `Punched In (${punchedInCount})`,
              not_punched_in: `Not Punched In (${totalCount - punchedInCount})`,
            };
            return (
              <button
                key={filter}
                onClick={() => setPunchFilter(filter)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  punchFilter === filter
                    ? "bg-primary text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {labels[filter]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-800">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <LiveTrackingMap
            employees={mapEmployees}
            onSelectEmployee={handleSelectEmployee}
          />
        )}
      </div>

      {/* Bottom Sheet - Employee List */}
      <div className="bg-white dark:bg-surface-dark rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] max-h-[40vh] overflow-y-auto z-10 relative -mt-6">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">
              {punchFilter === "all" ? "All Team Members" : punchFilter === "punched_in" ? "Punched In" : "Not Punched In"}
              <span className="text-gray-400 font-normal ml-1">({filteredEmployees.length})</span>
            </h3>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" /> Online
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500" /> Away
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400" /> Offline
              </span>
            </div>
          </div>
          {filteredEmployees.length === 0 && !loading ? (
            <p className="text-sm text-gray-500 text-center py-4">
              {searchQuery ? `No results for "${searchQuery}"` : "No team members found"}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredEmployees.map((emp) => (
                <div
                  key={emp.id}
                  onClick={() => handleSelectEmployee(emp.id)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedEmployeeId === emp.id
                      ? "border-primary bg-primary/5"
                      : "border-gray-100 dark:border-gray-700/50 hover:border-primary/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-surface-dark ${
                          emp.status === "online" ? "bg-green-500" : emp.status === "away" ? "bg-yellow-500" : "bg-gray-400"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{emp.name}</p>
                      <p className="text-xs text-gray-500">
                        {emp.punchedIn ? (
                          <span className="text-green-600 dark:text-green-400">Punched In</span>
                        ) : (
                          <span className="text-gray-400">Not Punched In</span>
                        )}
                        {emp.trail.length > 0 && ` · ${emp.trail.length} GPS points`}
                        {emp.phone && ` · ${emp.phone}`}
                      </p>
                    </div>
                  </div>
                  {emp.lat !== 0 && (
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {(emp as TrackedEmployee & { lastSeen?: string }).lastSeen || ""}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
