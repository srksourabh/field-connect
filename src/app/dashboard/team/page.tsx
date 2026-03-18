"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, Search, X } from "lucide-react";
import { logError } from "@/lib/utils";
import Link from "next/link";
import Organogram from "@/components/team/Organogram";
import EmployeeDetailSheet from "@/components/team/EmployeeDetailSheet";
import type { OrgNodeData } from "@/components/team/OrgNode";
import { supabase } from "@/lib/supabase";

interface ProfileRow {
  id: string;
  full_name: string;
  designation: string | null;
  reporting_manager_id: string | null;
  phone: string | null;
  city: string | null;
  department: string | null;
}

interface EmployeeDetail {
  name: string;
  designation: string;
  department: string;
  status: "online" | "away" | "offline";
  phone?: string;
  location?: string;
}

// Recursively filter tree to only include nodes matching search
function filterTree(node: OrgNodeData, query: string): OrgNodeData | null {
  const q = query.toLowerCase();
  const nameMatch = node.name.toLowerCase().includes(q);
  const desigMatch = node.designation.toLowerCase().includes(q);

  const filteredChildren = node.children
    ?.map((c) => filterTree(c, query))
    .filter(Boolean) as OrgNodeData[] | undefined;

  if (nameMatch || desigMatch || (filteredChildren && filteredChildren.length > 0)) {
    return { ...node, children: filteredChildren && filteredChildren.length > 0 ? filteredChildren : node.children };
  }
  return null;
}

export default function TeamPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [orgRoots, setOrgRoots] = useState<OrgNodeData[]>([]);
  const [employeeDetails, setEmployeeDetails] = useState<Record<string, EmployeeDetail>>({});
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrg() {
      try {
        // Get auth token for the API call
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        const res = await fetch("/api/team", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!res.ok) {
          setError("Failed to load team data");
          setLoading(false);
          return;
        }

        const { profiles, scope } = await res.json() as {
          profiles: ProfileRow[];
          scope: "full" | "subtree";
        };

        if (!profiles || profiles.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch today's attendance to determine live status
        const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        const todayStartIST = today + "T00:00:00+05:30";
        const employeeIds = profiles.map((p) => p.id);

        const [{ data: todayAttendance }, { data: todayLocations }] = await Promise.all([
          supabase
            .from("hr_attendance")
            .select("user_id, punch_in_at, punch_out_at, status")
            .in("user_id", employeeIds)
            .gte("created_at", todayStartIST),
          supabase
            .from("hr_location_logs")
            .select("user_id, captured_at")
            .in("user_id", employeeIds)
            .gte("captured_at", todayStartIST)
            .order("captured_at", { ascending: false }),
        ]);

        // Build status lookup: open session = online/away, closed session = offline
        const statusMap = new Map<string, "online" | "away" | "offline">();
        const openSessionUsers = new Set<string>();
        const punchInTimeMap = new Map<string, string>();
        const todayStatusMap = new Map<string, string>();

        for (const a of (todayAttendance || [])) {
          if (!a.punch_out_at) openSessionUsers.add(a.user_id);
          // Track earliest punch-in time per user
          if (a.punch_in_at && !punchInTimeMap.has(a.user_id)) {
            punchInTimeMap.set(a.user_id, new Date(a.punch_in_at).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
              timeZone: "Asia/Kolkata",
            }));
          }
          // Track attendance status
          if (a.status) todayStatusMap.set(a.user_id, a.status);
        }

        // Latest location log per user
        const latestLogTime = new Map<string, number>();
        for (const l of (todayLocations || [])) {
          if (!latestLogTime.has(l.user_id)) {
            latestLogTime.set(l.user_id, new Date(l.captured_at).getTime());
          }
        }

        for (const p of profiles) {
          if (openSessionUsers.has(p.id)) {
            const logTime = latestLogTime.get(p.id);
            if (logTime && Date.now() - logTime < 15 * 60 * 1000) {
              statusMap.set(p.id, "online");
            } else {
              statusMap.set(p.id, "away");
            }
          } else {
            statusMap.set(p.id, "offline");
          }
        }

        // Build employee details lookup
        const details: Record<string, EmployeeDetail> = {};
        for (const p of profiles) {
          details[p.id] = {
            name: p.full_name,
            designation: p.designation || "Employee",
            department: p.department || "General",
            status: statusMap.get(p.id) || "offline",
            phone: p.phone || undefined,
            location: p.city || undefined,
          };
        }
        setEmployeeDetails(details);

        // Build tree(s)
        const childMap: Record<string, ProfileRow[]> = {};
        const profileIds = new Set(profiles.map((p) => p.id));
        const roots: ProfileRow[] = [];

        for (const p of profiles) {
          // A node is a root if it has no manager, or its manager is outside the visible set
          if (!p.reporting_manager_id || !profileIds.has(p.reporting_manager_id)) {
            roots.push(p);
          } else {
            if (!childMap[p.reporting_manager_id]) {
              childMap[p.reporting_manager_id] = [];
            }
            childMap[p.reporting_manager_id].push(p);
          }
        }

        const buildNode = (profile: ProfileRow): OrgNodeData => {
          const children = childMap[profile.id] || [];
          return {
            id: profile.id,
            name: profile.full_name,
            designation: profile.designation || "Employee",
            phone: profile.phone || undefined,
            status: statusMap.get(profile.id) || "offline",
            punchInTime: punchInTimeMap.get(profile.id) || null,
            todayStatus: todayStatusMap.get(profile.id) || null,
            children: children.length > 0 ? children.map(buildNode) : undefined,
          };
        };

        // For full tree with a single root, wrap as before; for subtree, show all roots
        if (scope === "full" && roots.length === 1) {
          setOrgRoots([buildNode(roots[0])]);
        } else {
          setOrgRoots(roots.map(buildNode));
        }

        setLoading(false);
      } catch (err) {
        logError("fetchOrg failed:", err);
        setError("Failed to load team data");
        setLoading(false);
      }
    }

    fetchOrg();
  }, []);

  // Filter org tree when search query changes
  const filteredRoots = useMemo(() => {
    if (!orgRoots.length || !searchQuery.trim()) return orgRoots;
    return orgRoots
      .map((root) => filterTree(root, searchQuery.trim()))
      .filter(Boolean) as OrgNodeData[];
  }, [orgRoots, searchQuery]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link
          href="/dashboard"
          className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        {searchOpen ? (
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name..."
            autoFocus
            className="flex-1 mx-3 bg-transparent border-b border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary py-1"
          />
        ) : (
          <h1 className="text-lg font-semibold text-center flex-1">Team</h1>
        )}
        <button
          onClick={() => {
            if (searchOpen) {
              setSearchOpen(false);
              setSearchQuery("");
            } else {
              setSearchOpen(true);
            }
          }}
          className="p-2 -mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          {searchOpen ? (
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          ) : (
            <Search className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          )}
        </button>
      </header>

      {/* Quick Links */}
      <div className="px-6 py-4 flex gap-3">
        <Link
          href="/dashboard/team/tracking"
          className="flex-1 uds-btn-secondary text-xs py-2.5"
        >
          Live Tracking
        </Link>
        <Link
          href="/dashboard/team/approvals"
          className="flex-1 uds-btn-secondary text-xs py-2.5"
        >
          Approvals
        </Link>
      </div>

      {/* Organogram */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center text-red-400 text-sm px-6 text-center">
          {error}
        </div>
      ) : filteredRoots.length > 0 ? (
        <Organogram roots={filteredRoots} onSelectEmployee={setSelectedId} />
      ) : searchQuery ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          No results for &ldquo;{searchQuery}&rdquo;
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          No team data available
        </div>
      )}

      {/* Detail Sheet */}
      <EmployeeDetailSheet
        employee={selectedId ? employeeDetails[selectedId] ?? null : null}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
