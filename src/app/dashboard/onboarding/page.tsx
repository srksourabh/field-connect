"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Link2, Copy, Check, Loader2, Shield, Trash2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { showConfirm } from "@/components/ui/Dialog";
import { showToast } from "@/components/ui/Toast";

interface OnboardingToken {
  id: string;
  token: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

export default function OnboardingPage() {
  const { user, profile } = useAuth();
  const [tokens, setTokens] = useState<OnboardingToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    const { data } = await supabase
      .from("hr_onboarding_tokens")
      .select("*")
      .order("created_at", { ascending: false });
    setTokens((data as OnboardingToken[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (profile?.role === "admin" || profile?.role === "super_admin") fetchTokens();
    else setLoading(false);
  }, [profile, fetchTokens]);

  const generateLink = async () => {
    if (!user) return;
    setGenerating(true);

    // Generate a random token
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);

    const { error } = await supabase.from("hr_onboarding_tokens").insert({
      token,
      created_by: user.id,
    });

    if (error) {
      showToast("Failed to generate link: " + error.message, "error");
    } else {
      await fetchTokens();
    }
    setGenerating(false);
  };

  const copyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/onboard/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteToken = async (id: string) => {
    const confirmed = await showConfirm("Delete Link", "Delete this onboarding link?");
    if (!confirmed) return;
    await supabase.from("hr_onboarding_tokens").delete().eq("id", id);
    setTokens((prev) => prev.filter((t) => t.id !== id));
  };

  // Guard: Only admins can access
  if (profile && !["admin", "super_admin"].includes(profile.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <Shield className="w-12 h-12 text-gray-300 mb-4" />
        <h1 className="text-lg font-semibold mb-2">Access Denied</h1>
        <p className="text-sm text-gray-500 text-center mb-4">
          Only administrators can generate onboarding links.
        </p>
        <Link href="/dashboard" className="text-primary text-sm font-medium">
          Back to Dashboard
        </Link>
      </div>
    );
  }

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
        <h1 className="text-lg font-semibold text-center flex-1">
          Employee Onboarding
        </h1>
        <div className="w-9" />
      </header>

      {/* Content */}
      <div className="px-6 py-4 space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Generate a unique link and share it with a new employee. They can fill
          out the onboarding form without logging in. The link expires in 7 days.
        </p>

        {/* Generate Button */}
        <button
          onClick={generateLink}
          disabled={generating}
          className="uds-btn-primary w-full"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Link2 className="w-4 h-4" />
          )}
          {generating ? "Generating..." : "Generate Onboarding Link"}
        </button>

        {/* Tokens List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading links...</p>
          </div>
        ) : tokens.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">
            No onboarding links generated yet.
          </p>
        ) : (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Generated Links
            </h3>
            {tokens.map((t) => {
              const isExpired = new Date(t.expires_at) < new Date();
              const isUsed = !!t.used_at;
              const status = isUsed ? "Used" : isExpired ? "Expired" : "Active";
              const statusColor = isUsed
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : isExpired
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";

              return (
                <div
                  key={t.id}
                  className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-100 dark:border-gray-700/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-xs text-gray-600 dark:text-gray-300 font-mono">
                      /onboard/{t.token}
                    </code>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                      {status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-gray-400">
                      Created {new Date(t.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      {" · Expires "}
                      {new Date(t.expires_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </p>
                    <div className="flex items-center gap-1">
                      {!isUsed && !isExpired && (
                        <button
                          onClick={() => copyLink(t.token, t.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-primary"
                          title="Copy link"
                        >
                          {copiedId === t.id ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => deleteToken(t.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-red-500"
                        title="Delete link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
