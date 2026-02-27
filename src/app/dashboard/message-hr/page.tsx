"use client";

import { useState } from "react";
import { ChevronLeft, Send, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

const CATEGORIES = [
  { value: "complaint", label: "Complaint", color: "bg-red-100 dark:bg-red-900/20 text-red-600 border-red-200 dark:border-red-800" },
  { value: "suggestion", label: "Suggestion", color: "bg-blue-100 dark:bg-blue-900/20 text-blue-600 border-blue-200 dark:border-blue-800" },
  { value: "feedback", label: "Feedback", color: "bg-green-100 dark:bg-green-900/20 text-green-600 border-green-200 dark:border-green-800" },
  { value: "other", label: "Other", color: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700" },
];

export default function MessageHRPage() {
  const { session } = useAuth();
  const [category, setCategory] = useState("complaint");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || !session?.access_token) return;

    setLoading(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ category, subject: subject.trim(), message: message.trim(), is_anonymous: isAnonymous }),
    });

    setLoading(false);
    if (res.ok) {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
          <Link href="/dashboard/profile" className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Link>
          <h1 className="text-lg font-semibold text-center flex-1">Message HR</h1>
          <div className="w-9" />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Message Sent</h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            Your {isAnonymous ? "anonymous " : ""}message has been sent to HR. {isAnonymous ? "Your identity is kept confidential." : ""}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => { setSent(false); setSubject(""); setMessage(""); }}
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium"
            >
              Send Another
            </button>
            <Link href="/dashboard/profile" className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium">
              Back to Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link href="/dashboard/profile" className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-lg font-semibold text-center flex-1">Message HR</h1>
        <div className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4">
        {/* Privacy notice */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 mb-4">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-primary">Your privacy is protected</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Anonymous messages hide your identity from HR. Only super admins and HR personnel can view messages.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-all ${
                    category === cat.value
                      ? cat.color + " ring-2 ring-offset-1 ring-primary/30"
                      : "bg-white dark:bg-surface-dark border-gray-200 dark:border-gray-700 text-gray-500"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your message"
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              maxLength={200}
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your complaint, suggestion, or feedback in detail..."
              rows={6}
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              maxLength={2000}
            />
            <p className="text-[10px] text-gray-400 mt-1 text-right">{message.length}/2000</p>
          </div>

          {/* Anonymous toggle */}
          <label className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 cursor-pointer">
            <div>
              <p className="text-sm font-medium">Send Anonymously</p>
              <p className="text-[11px] text-gray-500">Your name will be hidden from HR</p>
            </div>
            <div
              className={`w-11 h-6 rounded-full transition-colors relative ${
                isAnonymous ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
              }`}
              onClick={() => setIsAnonymous(!isAnonymous)}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  isAnonymous ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </div>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !subject.trim() || !message.trim()}
            className="w-full py-3.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {loading ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
    </div>
  );
}
