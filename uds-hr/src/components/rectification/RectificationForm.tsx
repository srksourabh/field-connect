"use client";

import { useState } from "react";
import { ChevronDown, Send, Calendar } from "lucide-react";

interface RectificationFormProps {
  attendanceDate?: string;
  originalPunchIn?: string;
  originalPunchOut?: string;
  onSubmit: (data: {
    rectificationType: string;
    attendanceDate: string;
    correctedPunchIn: string;
    correctedPunchOut: string;
    correctedStatus: string;
    reason: string;
  }) => void;
  onCancel: () => void;
  submitting?: boolean;
}

const rectificationTypes = [
  { value: "missed_punch_in", label: "Missed Punch In" },
  { value: "missed_punch_out", label: "Missed Punch Out" },
  { value: "wrong_time", label: "Wrong Time Recorded" },
  { value: "other", label: "Other" },
];

export default function RectificationForm({
  attendanceDate = "",
  originalPunchIn = "",
  originalPunchOut = "",
  onSubmit,
  onCancel,
  submitting = false,
}: RectificationFormProps) {
  const [rectificationType, setRectificationType] = useState("missed_punch_in");
  const [date, setDate] = useState(attendanceDate);
  const [correctedPunchIn, setCorrectedPunchIn] = useState("");
  const [correctedPunchOut, setCorrectedPunchOut] = useState("");
  const [correctedStatus, setCorrectedStatus] = useState("present");
  const [reason, setReason] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      rectificationType,
      attendanceDate: date,
      correctedPunchIn,
      correctedPunchOut,
      correctedStatus,
      reason,
    });
  };

  const showPunchIn = rectificationType !== "missed_punch_out";
  const showPunchOut = rectificationType !== "missed_punch_in";

  return (
    <section className="px-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-6">
        Request Correction
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rectification Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Rectification Type
          </label>
          <div className="relative">
            <select
              value={rectificationType}
              onChange={(e) => setRectificationType(e.target.value)}
              className="w-full bg-white dark:bg-[#1c2a36] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg pl-4 pr-10 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
            >
              {rectificationTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500 dark:text-gray-400">
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Attendance Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Attendance Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white dark:bg-[#1c2a36] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg pl-10 pr-2 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Original Values (read-only) */}
        {(originalPunchIn || originalPunchOut) && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
              Currently Recorded
            </p>
            <div className="grid grid-cols-2 gap-4">
              {originalPunchIn && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Punch In</p>
                  <p className="text-sm font-medium">{originalPunchIn}</p>
                </div>
              )}
              {originalPunchOut && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Punch Out</p>
                  <p className="text-sm font-medium">{originalPunchOut}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Corrected Times */}
        <div className="grid grid-cols-2 gap-4">
          {showPunchIn && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Correct Punch In
              </label>
              <input
                type="time"
                value={correctedPunchIn}
                onChange={(e) => setCorrectedPunchIn(e.target.value)}
                className="w-full bg-white dark:bg-[#1c2a36] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg pl-3 pr-2 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm [color-scheme:dark]"
              />
            </div>
          )}
          {showPunchOut && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Correct Punch Out
              </label>
              <input
                type="time"
                value={correctedPunchOut}
                onChange={(e) => setCorrectedPunchOut(e.target.value)}
                className="w-full bg-white dark:bg-[#1c2a36] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg pl-3 pr-2 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm [color-scheme:dark]"
              />
            </div>
          )}
        </div>

        {/* Corrected Status */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Correct Status
          </label>
          <div className="relative">
            <select
              value={correctedStatus}
              onChange={(e) => setCorrectedStatus(e.target.value)}
              className="w-full bg-white dark:bg-[#1c2a36] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg pl-4 pr-10 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
            >
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="half-day">Half Day</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500 dark:text-gray-400">
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Reason
            </label>
            <span className="text-xs text-gray-400">{reason.length}/200</span>
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 200))}
            rows={4}
            placeholder="Explain why this correction is needed..."
            className="w-full bg-white dark:bg-[#1c2a36] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none text-sm"
          />
        </div>

        {/* Actions */}
        <div className="pt-2 pb-4 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98] transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-[2] bg-primary hover:bg-blue-600 text-white font-semibold py-4 rounded-xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{submitting ? "Submitting..." : "Submit Request"}</span>
            {!submitting && <Send className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </section>
  );
}
