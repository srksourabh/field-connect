"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Loader2, Mail, MailOpen, ShieldCheck, User, Clock } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

interface HrMessage {
  id: string;
  sender_id: string;
  sender_name: string | null;
  category: string;
  subject: string;
  message: string;
  is_anonymous: boolean;
  is_read: boolean;
  created_at: string;
}

const CATEGORY_STYLES: Record<string, { label: string; color: string }> = {
  complaint: { label: "Complaint", color: "bg-red-100 dark:bg-red-900/20 text-red-600" },
  suggestion: { label: "Suggestion", color: "bg-blue-100 dark:bg-blue-900/20 text-blue-600" },
  feedback: { label: "Feedback", color: "bg-green-100 dark:bg-green-900/20 text-green-600" },
  other: { label: "Other", color: "bg-gray-100 dark:bg-gray-800 text-gray-600" },
};

export default function HrInboxPage() {
  const { session, profile } = useAuth();
  const [messages, setMessages] = useState<HrMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    const res = await fetch(`/api/messages?filter=${filter}&limit=100`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages || []);
      setUnreadCount(data.unreadCount || 0);
    }
    setLoading(false);
  }, [session?.access_token, filter]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Role guard: only admin/super_admin can access HR inbox
  const hasAccess = profile?.role === "admin" || profile?.role === "super_admin";
  if (profile && !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-lg font-semibold mb-2">Access Denied</p>
        <p className="text-sm text-gray-500">You don&apos;t have permission to access this page.</p>
      </div>
    );
  }

  const markAsRead = async (id: string) => {
    if (!session?.access_token) return;
    await fetch("/api/messages", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id }),
    });
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, is_read: true } : m));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleExpand = (msg: HrMessage) => {
    if (expandedId === msg.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(msg.id);
    if (!msg.is_read) markAsRead(msg.id);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = Math.floor(diffMs / 3600000);
    if (diffH < 1) return `${Math.max(1, Math.floor(diffMs / 60000))}m ago`;
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link href="/dashboard/organisation" className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-lg font-semibold text-center flex-1">
          HR Inbox
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold align-middle">
              {unreadCount}
            </span>
          )}
        </h1>
        <div className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 space-y-3">
        {/* Filter tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${
              filter === "all" ? "bg-primary text-white" : "bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
            }`}
          >
            All Messages
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${
              filter === "unread" ? "bg-primary text-white" : "bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
            }`}
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Mail className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{filter === "unread" ? "No unread messages" : "No messages yet"}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const cat = CATEGORY_STYLES[msg.category] || CATEGORY_STYLES.other;
            const isExpanded = expandedId === msg.id;
            return (
              <button
                key={msg.id}
                onClick={() => handleExpand(msg)}
                className={`w-full text-left bg-white dark:bg-surface-dark rounded-xl border transition-all ${
                  msg.is_read
                    ? "border-gray-100 dark:border-gray-700/50"
                    : "border-primary/30 bg-primary/[0.02]"
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {msg.is_read ? (
                        <MailOpen className="w-4 h-4 text-gray-400 shrink-0" />
                      ) : (
                        <Mail className="w-4 h-4 text-primary shrink-0" />
                      )}
                      <span className={`text-sm font-medium truncate ${!msg.is_read ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>
                        {msg.subject}
                      </span>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${cat.color}`}>
                      {cat.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1">
                      {msg.is_anonymous ? (
                        <><ShieldCheck className="w-3 h-3" /> Anonymous</>
                      ) : (
                        <><User className="w-3 h-3" /> {msg.sender_name}</>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDate(msg.created_at)}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {msg.message}
                      </p>
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
