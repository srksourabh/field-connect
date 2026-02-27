"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Shield, Loader2, Megaphone, Send, Check } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function BroadcastNotificationPage() {
  const { profile, session } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>(["all"]);
  const [selectedDesignations, setSelectedDesignations] = useState<string[]>(["all"]);
  const [designationOptions, setDesignationOptions] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isUniversal =
    profile?.role === "super_admin" ||
    (profile?.designation?.toLowerCase().includes("hr") &&
      ["admin", "super_admin"].includes(profile?.role || ""));

  // Fetch unique designations
  const fetchDesignations = useCallback(async () => {
    const { data } = await supabase
      .from("hr_profiles")
      .select("designation")
      .not("designation", "is", null)
      .is("deactivated_at", null);

    if (data) {
      const unique = Array.from(new Set(data.map((d) => d.designation).filter(Boolean))) as string[];
      setDesignationOptions(unique.sort());
    }
  }, []);

  useEffect(() => {
    fetchDesignations();
  }, [fetchDesignations]);

  const toggleProject = (value: string) => {
    if (value === "all") {
      setSelectedProjects(["all"]);
      return;
    }
    setSelectedProjects((prev) => {
      const withoutAll = prev.filter((p) => p !== "all");
      if (withoutAll.includes(value)) {
        const next = withoutAll.filter((p) => p !== value);
        return next.length === 0 ? ["all"] : next;
      }
      return [...withoutAll, value];
    });
  };

  const toggleDesignation = (value: string) => {
    if (value === "all") {
      setSelectedDesignations(["all"]);
      return;
    }
    setSelectedDesignations((prev) => {
      const withoutAll = prev.filter((p) => p !== "all");
      if (withoutAll.includes(value)) {
        const next = withoutAll.filter((p) => p !== value);
        return next.length === 0 ? ["all"] : next;
      }
      return [...withoutAll, value];
    });
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim() || !session?.access_token) return;

    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/broadcast-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          projects: selectedProjects,
          designations: selectedDesignations,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult({ type: "success", text: data.message });
        setTitle("");
        setBody("");
        setSelectedProjects(["all"]);
        setSelectedDesignations(["all"]);
      } else {
        setResult({ type: "error", text: data.error || "Failed to send" });
      }
    } catch {
      setResult({ type: "error", text: "Network error" });
    } finally {
      setSending(false);
    }
  };

  // Guard: only super_admin or HR
  if (profile && !isUniversal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <Shield className="w-12 h-12 text-gray-300 mb-4" />
        <h1 className="text-lg font-semibold mb-2">Access Denied</h1>
        <p className="text-sm text-gray-500 text-center mb-4">
          Only super admins and HR can access notifications broadcast.
        </p>
        <Link href="/dashboard" className="text-primary text-sm font-medium">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const projectOptions = [
    { value: "all", label: "All Projects" },
    { value: "in-house", label: "In-House" },
    { value: "uds-pos", label: "UDS POS" },
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link
          href="/dashboard/admin"
          className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-lg font-semibold text-center flex-1 flex items-center justify-center gap-2">
          <Megaphone className="w-5 h-5" />
          Broadcast Notification
        </h1>
        <div className="w-9" />
      </header>

      <div className="px-5 py-6 space-y-5 max-w-lg mx-auto">
        {/* Result message */}
        {result && (
          <div
            className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
              result.type === "success"
                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800"
                : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800"
            }`}
          >
            {result.type === "success" && <Check className="w-4 h-4 shrink-0" />}
            {result.text}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Office Closed Tomorrow"
            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Body */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Message *</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your announcement here..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        </div>

        {/* Target Projects */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-2 block">Target Projects</label>
          <div className="flex flex-wrap gap-2">
            {projectOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleProject(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedProjects.includes(opt.value)
                    ? "bg-primary text-white border-primary"
                    : "bg-white dark:bg-surface-dark border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Target Designations */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-2 block">Target Designations</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => toggleDesignation("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                selectedDesignations.includes("all")
                  ? "bg-primary text-white border-primary"
                  : "bg-white dark:bg-surface-dark border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
              }`}
            >
              All
            </button>
            {designationOptions.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDesignation(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedDesignations.includes(d)
                    ? "bg-primary text-white border-primary"
                    : "bg-white dark:bg-surface-dark border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={sending || !title.trim() || !body.trim()}
          className="w-full py-3.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {sending ? "Sending..." : "Send Broadcast"}
        </button>
      </div>
    </div>
  );
}
