"use client";

import { X, LogIn, LogOut, Clock } from "lucide-react";
import type { HrAttendance } from "@/lib/database.types";

interface SessionTimelineModalProps {
  open: boolean;
  onClose: () => void;
  sessions: HrAttendance[];
}

function formatIST(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function durationStr(punchIn: string, punchOut: string): string {
  const ms = new Date(punchOut).getTime() - new Date(punchIn).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function SessionTimelineModal({ open, onClose, sessions }: SessionTimelineModalProps) {
  if (!open) return null;

  const workSessions = sessions.filter((s) => s.punch_in_at);

  // Compute total worked time
  let totalMs = 0;
  for (const s of workSessions) {
    if (s.punch_in_at && s.punch_out_at) {
      totalMs += new Date(s.punch_out_at).getTime() - new Date(s.punch_in_at).getTime();
    } else if (s.punch_in_at) {
      totalMs += Date.now() - new Date(s.punch_in_at).getTime();
    }
  }
  const totalH = Math.floor(totalMs / 3600000);
  const totalM = Math.floor((totalMs % 3600000) / 60000);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-surface-dark rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700/50">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Today&apos;s Sessions — {workSessions.length} session{workSessions.length !== 1 ? "s" : ""}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Timeline */}
        <div className="max-h-[60vh] overflow-y-auto px-4 py-4">
          {workSessions.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              No punch records for today
            </div>
          ) : (
            <div className="space-y-0">
              {workSessions.map((session, idx) => {
                const isOpen = !session.punch_out_at;
                return (
                  <div key={session.id} className="relative pl-8">
                    {/* Vertical line connecting sessions */}
                    {idx < workSessions.length - 1 && (
                      <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                    )}

                    {/* Session number badge */}
                    <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary">{idx + 1}</span>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 mb-3">
                      {/* Punch In */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <LogIn className="w-3 h-3 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-16">Punch In</span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-white">
                          {formatIST(session.punch_in_at!)}
                        </span>
                      </div>

                      {/* Punch Out */}
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          isOpen
                            ? "bg-green-100 dark:bg-green-900/30"
                            : "bg-red-100 dark:bg-red-900/30"
                        }`}>
                          <LogOut className={`w-3 h-3 ${
                            isOpen
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`} />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-16">Punch Out</span>
                        {isOpen ? (
                          <span className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-gray-800 dark:text-white">
                            {formatIST(session.punch_out_at!)}
                          </span>
                        )}
                      </div>

                      {/* Duration */}
                      {session.punch_in_at && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700/50">
                          <p className="text-[11px] text-gray-400">
                            Duration:{" "}
                            <span className="font-semibold text-gray-600 dark:text-gray-300">
                              {session.punch_out_at
                                ? durationStr(session.punch_in_at, session.punch_out_at)
                                : "In progress"}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer total */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Total Worked</span>
            <span className="text-sm font-bold text-primary">
              {totalH}h {totalM}m
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
