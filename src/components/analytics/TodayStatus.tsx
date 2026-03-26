"use client";

import { useState } from "react";
import {
  UserCheck,
  UserX,
  Clock,
  MapPin,
  Trophy,
  Zap,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Activity,
  CheckCircle2,
} from "lucide-react";

interface TodayStatusProps {
  todayStatus: {
    presentCount: number;
    absentCount: number;
    onLeaveCount: number;
    activeNowCount: number;
    completedCount: number;
    earliestPunchIn: { name: string; time: string; userId: string } | null;
    longestActive: { name: string; hours: string; userId: string } | null;
    maxDistance: { name: string; distance: string; userId: string } | null;
    currentlyActive: { userId: string; name: string; designation: string }[];
    dntList: { userId: string; name: string; designation: string; project: string; reportingManager: string }[];
  };
  totalEmployees: number;
}

export default function TodayStatus({ todayStatus, totalEmployees }: TodayStatusProps) {
  const [showDNT, setShowDNT] = useState(false);
  const [showActive, setShowActive] = useState(false);

  const {
    presentCount,
    absentCount,
    onLeaveCount,
    activeNowCount,
    completedCount,
    earliestPunchIn,
    longestActive,
    maxDistance,
    currentlyActive,
    dntList,
  } = todayStatus;

  const attendancePercent = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Today&apos;s Status
        </h2>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
          Live
        </span>
      </div>

      {/* Attendance Ring + Quick Stats */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 p-4">
        <div className="flex items-center gap-5">
          {/* Circular Progress */}
          <div className="relative w-20 h-20 shrink-0">
            <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-100 dark:text-gray-700" />
              <circle
                cx="18" cy="18" r="15.9" fill="none" strokeWidth="3"
                strokeDasharray={`${attendancePercent} 100`}
                strokeLinecap="round"
                className="text-green-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold">{attendancePercent}%</span>
            </div>
          </div>

          {/* Quick Numbers */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 flex-1">
            <div className="flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs text-gray-500">Present</span>
              <span className="text-sm font-bold ml-auto">{presentCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <UserX className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs text-gray-500">Absent</span>
              <span className="text-sm font-bold ml-auto">{absentCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs text-gray-500">Active</span>
              <span className="text-sm font-bold ml-auto">{activeNowCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-xs text-gray-500">Done</span>
              <span className="text-sm font-bold ml-auto">{completedCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs text-gray-500">On Leave</span>
              <span className="text-sm font-bold ml-auto">{onLeaveCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500">Total</span>
              <span className="text-sm font-bold ml-auto">{totalEmployees}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Highlights — Earliest, Longest, Farthest */}
      <div className="grid grid-cols-1 gap-2">
        {earliestPunchIn && (
          <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-500 dark:text-gray-400">First to Punch In</p>
              <p className="text-sm font-semibold truncate">{earliestPunchIn.name}</p>
            </div>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400 shrink-0">{earliestPunchIn.time}</span>
          </div>
        )}

        {longestActive && (
          <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Longest Active Time</p>
              <p className="text-sm font-semibold truncate">{longestActive.name}</p>
            </div>
            <span className="text-sm font-bold text-green-600 dark:text-green-400 shrink-0">{longestActive.hours}</span>
          </div>
        )}

        {maxDistance && (
          <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Max Distance Traveled</p>
              <p className="text-sm font-semibold truncate">{maxDistance.name}</p>
            </div>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 shrink-0">{maxDistance.distance}</span>
          </div>
        )}
      </div>

      {/* Currently Active List (collapsible) */}
      {currentlyActive.length > 0 && (
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
          <button
            onClick={() => setShowActive(!showActive)}
            className="w-full px-4 py-3 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-semibold">Currently Active</span>
              <span className="text-xs text-gray-400 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                {activeNowCount}
              </span>
            </div>
            {showActive ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {showActive && (
            <div className="px-4 pb-3 space-y-2 max-h-60 overflow-y-auto">
              {currentlyActive.map((emp) => (
                <div key={emp.userId} className="flex items-center gap-3 py-1.5">
                  <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-[10px] font-bold text-green-600 dark:text-green-400 shrink-0">
                    {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{emp.name}</p>
                    {emp.designation && <p className="text-[10px] text-gray-400 truncate">{emp.designation}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DNT List (collapsible) — Did Not Turn-up */}
      {dntList.length > 0 && (
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-red-100 dark:border-red-900/30 overflow-hidden">
          <button
            onClick={() => setShowDNT(!showDNT)}
            className="w-full px-4 py-3 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-red-500" />
              <span className="text-sm font-semibold">DNT — Did Not Turn-up</span>
              <span className="text-xs text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                {dntList.length}
              </span>
            </div>
            {showDNT ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {showDNT && (
            <div className="px-4 pb-3 space-y-1.5 max-h-72 overflow-y-auto">
              {dntList.map((emp) => (
                <div key={emp.userId} className="flex items-center gap-3 py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-[10px] font-bold text-red-600 dark:text-red-400 shrink-0">
                    {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{emp.name}</p>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      {emp.designation && <span>{emp.designation}</span>}
                      {emp.designation && emp.reportingManager && <span>·</span>}
                      {emp.reportingManager && <span>Mgr: {emp.reportingManager}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
