"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import RectificationForm from "@/components/rectification/RectificationForm";
import { useAuth } from "@/lib/auth";
import { createRectificationRequest } from "@/lib/rectification-api";
import { createNotification } from "@/lib/notification-api";
import { showToast } from "@/components/ui/Toast";

export default function RectificationPage() {
  const { user, profile } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (data: {
    rectificationType: string;
    attendanceDate: string;
    correctedPunchIn: string;
    correctedPunchOut: string;
    correctedStatus: string;
    reason: string;
  }) => {
    if (!user) return;
    setSubmitting(true);

    const result = await createRectificationRequest({
      user_id: user.id,
      attendance_date: data.attendanceDate,
      rectification_type: data.rectificationType as "missed_punch_in" | "missed_punch_out" | "wrong_time" | "other",
      corrected_punch_in: data.correctedPunchIn
        ? `${data.attendanceDate}T${data.correctedPunchIn}:00`
        : null,
      corrected_punch_out: data.correctedPunchOut
        ? `${data.attendanceDate}T${data.correctedPunchOut}:00`
        : null,
      corrected_status: data.correctedStatus as "present" | "late" | "half-day",
      reason: data.reason,
    });

    if (result) {
      // Notify reporting manager
      if (profile?.reporting_manager_id) {
        await createNotification({
          user_id: profile.reporting_manager_id,
          title: "New Rectification Request",
          body: `${profile.full_name} requested a rectification for ${data.attendanceDate}.`,
          type: "rectification_request",
          reference_id: result.id,
          reference_type: "rectification_request",
        });
      }
      setSubmitted(true);
    } else {
      showToast("Failed to submit rectification. Please try again.", "error");
    }
    setSubmitting(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link
          href="/dashboard/attendance"
          className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-base font-semibold text-center flex-1 truncate px-2">
          Request Rectification
        </h1>
        <div className="w-9" />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-8 pt-6">
        {submitted ? (
          <div className="px-6 flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2">Request Submitted</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              Your rectification request has been sent to your manager for approval.
            </p>
            <Link
              href="/dashboard/attendance"
              className="text-primary font-medium text-sm hover:text-primary/80 transition-colors"
            >
              Back to Attendance
            </Link>
          </div>
        ) : (
          <RectificationForm
            onSubmit={handleSubmit}
            onCancel={() => window.history.back()}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  );
}
