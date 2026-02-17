"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import LeaveBalanceCards from "@/components/leave/LeaveBalanceCards";
import LeaveApplicationForm from "@/components/leave/LeaveApplicationForm";
import LeaveHistoryList from "@/components/leave/LeaveHistoryList";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { createNotification } from "@/lib/notification-api";
import { getUserLeaveRequests, withdrawLeaveRequest } from "@/lib/leave-api";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { addToQueue } from "@/lib/sync-queue";
import { cacheSet, cacheGet } from "@/lib/offline-cache";
import type { HrLeaveBalance, HrLeaveRequest } from "@/lib/database.types";

export default function LeavePage() {
  const { user, profile } = useAuth();
  const isOnline = useOnlineStatus();
  const [balance, setBalance] = useState<HrLeaveBalance | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [leaveHistory, setLeaveHistory] = useState<HrLeaveRequest[]>([]);

  // Restore cached data immediately for offline/instant display
  useEffect(() => {
    if (!user) return;
    const cachedBalance = cacheGet<HrLeaveBalance>(user.id, "leave_balance_full");
    if (cachedBalance) setBalance(cachedBalance.data);
    const cachedHistory = cacheGet<HrLeaveRequest[]>(user.id, "leave_history");
    if (cachedHistory) setLeaveHistory(cachedHistory.data);
  }, [user]);

  const fetchBalance = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("hr_leave_balances")
        .select("*")
        .eq("user_id", user.id)
        .eq("year", new Date().getFullYear())
        .single();
      if (data) {
        setBalance(data);
        cacheSet(user.id, "leave_balance_full", data);
      }
    } catch {
      // Offline — cached data already loaded
    }
  }, [user]);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    try {
      const requests = await getUserLeaveRequests(user.id);
      setLeaveHistory(requests);
      cacheSet(user.id, "leave_history", requests);
    } catch {
      // Offline — cached data already loaded
    }
  }, [user]);

  useEffect(() => {
    fetchBalance();
    fetchHistory();
  }, [fetchBalance, fetchHistory]);

  const handleSubmit = async (data: {
    type: string;
    startDate: string;
    endDate: string;
    reason: string;
    attachmentUrl: string | null;
  }) => {
    if (!user) return;

    setSubmitting(true);
    setSuccess(false);

    const typeKey = data.type as "sick" | "casual" | "compoff" | "privilege";
    const insertPayload = {
      user_id: user.id,
      type: typeKey,
      start_date: data.startDate,
      end_date: data.endDate,
      reason: data.reason || null,
      attachment_url: data.attachmentUrl || null,
      status: "pending" as const,
    };

    // Calculate days
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (!isOnline) {
      // Queue for sync when back online — skip balance check (validated server-side on approval)
      addToQueue({
        id: crypto.randomUUID(),
        type: "leave_request",
        payload: insertPayload,
        timestamp: new Date().toISOString(),
      });
      setSubmitting(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      return;
    }

    // Online path — validate balance
    if (balance) {
      const totalKeyMap: Record<string, string> = {
        sick: "sick_leave_total", casual: "casual_leave_total",
        privilege: "privilege_leave_total", compoff: "compoff_total",
      };
      const usedKeyMap: Record<string, string> = {
        sick: "sick_leave_used", casual: "casual_leave_used",
        privilege: "privilege_leave_used", compoff: "compoff_used",
      };
      const totalKey = (totalKeyMap[typeKey] || `${typeKey}_leave_total`) as keyof HrLeaveBalance;
      const usedKey = (usedKeyMap[typeKey] || `${typeKey}_leave_used`) as keyof HrLeaveBalance;
      const remaining = (balance[totalKey] as number) - (balance[usedKey] as number);

      if (days > remaining) {
        alert(`Not enough ${data.type} leave. You have ${remaining} day(s) remaining.`);
        setSubmitting(false);
        return;
      }
    }

    // Create leave request
    const { error: reqError } = await supabase.from("hr_leave_requests").insert(insertPayload);

    if (reqError) {
      alert("Failed to submit: " + reqError.message);
      setSubmitting(false);
      return;
    }

    // Notify reporting manager (balance deducted only on approval)
    if (profile?.reporting_manager_id) {
      await createNotification({
        user_id: profile.reporting_manager_id,
        title: "New Leave Request",
        body: `${profile.full_name} requested ${days} day(s) of ${data.type} leave from ${data.startDate} to ${data.endDate}.`,
        type: "leave_request",
        reference_type: "leave_request",
      });
    }

    await fetchBalance();
    await fetchHistory();
    setSubmitting(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#15202b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link
          href="/dashboard"
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Leave Application
        </h1>
        <div className="w-9" />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
        <LeaveBalanceCards balance={balance} />

        {success && (
          <div className="mx-6 mb-4 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm text-center">
            Leave request submitted successfully!
          </div>
        )}

        <LeaveApplicationForm
          onSubmit={handleSubmit}
          submitting={submitting}
          privilegeEnabled={(balance?.privilege_leave_total ?? 0) > 0}
        />

        <LeaveHistoryList
          requests={leaveHistory}
          onWithdraw={async (requestId) => {
            if (!user) return;
            const ok = await withdrawLeaveRequest(requestId, user.id);
            if (ok) {
              await fetchHistory();
              await fetchBalance();
            }
          }}
        />
      </div>
    </div>
  );
}
