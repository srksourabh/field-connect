"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Mail, MailOpen, FileCheck, FileX, AlertCircle, Megaphone } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  type HrNotification,
} from "@/lib/notification-api";

const typeIcon: Record<string, typeof Mail> = {
  leave_request: Mail,
  leave_approved: FileCheck,
  leave_rejected: FileX,
  rectification_request: Mail,
  rectification_approved: FileCheck,
  rectification_rejected: FileX,
  system: AlertCircle,
  announcement: Megaphone,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const typeRoute: Record<string, string> = {
  leave_request: "/dashboard/team/approvals",
  leave_approved: "/dashboard/leave",
  leave_rejected: "/dashboard/leave",
  leave_withdrawn: "/dashboard/team/approvals",
  rectification_request: "/dashboard/team/approvals",
  rectification_approved: "/dashboard/attendance",
  rectification_rejected: "/dashboard/attendance",
};

export default function NotificationDropdown() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<HrNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [items, count] = await Promise.all([
      getUserNotifications(user.id),
      getUnreadCount(user.id),
    ]);
    setNotifications(items);
    setUnread(count);
  }, [user]);

  useEffect(() => {
    refresh();
    // Poll every 30 seconds
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleRead = async (n: HrNotification) => {
    if (!n.is_read) {
      await markAsRead(n.id);
      setUnread((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
      );
    }
    // Navigate to relevant page
    const route = typeRoute[n.type];
    if (route) {
      setOpen(false);
      router.push(route);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllAsRead(user.id);
    setUnread(0);
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors relative"
      >
        <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 max-h-96 bg-white dark:bg-surface-dark rounded-xl shadow-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700/50">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[320px]">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = typeIcon[n.type] || Mail;
                const isRead = n.is_read;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleRead(n)}
                    className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-50 dark:border-gray-800/30 ${
                      !isRead ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                    }`}
                  >
                    <div className={`mt-0.5 p-1.5 rounded-lg ${!isRead ? "bg-primary/10" : "bg-gray-100 dark:bg-gray-800"}`}>
                      {isRead ? (
                        <MailOpen className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Icon className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!isRead ? "font-semibold" : "font-medium text-gray-600 dark:text-gray-400"}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                    {!isRead && (
                      <span className="mt-2 w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
