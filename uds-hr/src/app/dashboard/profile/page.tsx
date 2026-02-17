"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, Settings, LogOut, Shield, Bell, Moon, Sun, Monitor, ChevronRight, KeyRound, Camera, X, Eye, EyeOff, Users, UserPlus, Megaphone } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [daysPresent, setDaysPresent] = useState<number | null>(null);
  const [leavesLeft, setLeavesLeft] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [adminNames, setAdminNames] = useState<string[]>([]);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const monthEnd = now.toISOString().split("T")[0];

    // Days present this month
    const { count: presentCount } = await supabase
      .from("hr_attendance")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", monthStart)
      .lte("created_at", monthEnd + "T23:59:59");
    setDaysPresent(presentCount ?? 0);

    // Leave balance remaining
    const { data: bal } = await supabase
      .from("hr_leave_balances")
      .select("*")
      .eq("user_id", user.id)
      .eq("year", now.getFullYear())
      .single();
    if (bal) {
      const d = bal as Record<string, unknown>;
      const total =
        ((d.sick_leave_total as number) ?? 0) - ((d.sick_leave_used as number) ?? 0) +
        ((d.casual_leave_total as number) ?? 0) - ((d.casual_leave_used as number) ?? 0) +
        ((d.compoff_total as number) ?? 0) - ((d.compoff_used as number) ?? 0);
      setLeavesLeft(total);
    } else {
      setLeavesLeft(0);
    }

    // Pending leave requests
    const { count: pending } = await supabase
      .from("hr_leave_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "pending");
    setPendingCount(pending ?? 0);

    // Fetch admin names (for admin users)
    const { data: admins } = await supabase
      .from("hr_profiles")
      .select("full_name")
      .eq("role", "admin")
      .order("full_name");
    setAdminNames((admins || []).map((a) => a.full_name));
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const displayName = profile?.full_name ?? "User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  const menuItems = [
    { icon: Bell, label: "Notifications", href: "#" },
    { icon: Shield, label: "Privacy & Security", href: "#" },
    { icon: KeyRound, label: "Change Password", href: "#", action: () => setShowPasswordModal(true) },
    { icon: Moon, label: "Appearance", href: "#", action: () => setShowAppearanceModal(true) },
    { icon: Settings, label: "Settings", href: "#" },
    ...(isAdmin
      ? [
          { icon: Users, label: `Employee Management (${adminNames.length})`, href: "/dashboard/admin" },
          { icon: UserPlus, label: "Add Employee", href: "/dashboard/admin/employees" },
          { icon: Megaphone, label: "Broadcast Notification", href: "/dashboard/admin/notifications" },
        ]
      : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    // Hard navigation to ensure middleware sees cleared cookies
    window.location.href = "/login";
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${profile.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      await supabase
        .from("hr_profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      // Refresh page to show new avatar
      window.location.reload();
    } finally {
      setUploading(false);
    }
  };

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
        <h1 className="text-lg font-semibold text-center flex-1">Profile</h1>
        <div className="w-9" />
      </header>

      {/* Profile Card */}
      <div className="px-6 py-8 flex flex-col items-center">
        <div className="relative mb-4">
          {profile?.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={displayName}
              width={80}
              height={80}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold">
              {initials}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md border-2 border-white dark:border-background-dark"
          >
            <Camera className="w-3.5 h-3.5 text-white" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>
        <h2 className="text-xl font-bold">{displayName}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{profile?.designation ?? ""}</p>
        <p className="text-xs text-gray-400 mt-1">{profile?.phone ?? ""}</p>
      </div>

      {/* Quick Stats */}
      <div className="px-6 grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white dark:bg-surface-dark rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700/50">
          <p className="text-lg font-bold text-primary">{daysPresent ?? "--"}</p>
          <p className="text-xs text-gray-500">Days Present</p>
        </div>
        <div className="bg-white dark:bg-surface-dark rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700/50">
          <p className="text-lg font-bold text-emerald-500">{leavesLeft ?? "--"}</p>
          <p className="text-xs text-gray-500">Leaves Left</p>
        </div>
        <div className="bg-white dark:bg-surface-dark rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700/50">
          <p className="text-lg font-bold text-amber-500">{pendingCount ?? "--"}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
      </div>

      {/* Menu */}
      <div className="px-6 space-y-2 mb-8">
        {menuItems.map((item) =>
          item.action ? (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full flex items-center justify-between p-4 bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          ) : (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center justify-between p-4 bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          )
        )}
      </div>

      {/* Logout */}
      <div className="px-6 pb-8">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <PasswordChangeModal onClose={() => setShowPasswordModal(false)} />
      )}

      {/* Appearance Modal */}
      {showAppearanceModal && (
        <AppearanceModal onClose={() => setShowAppearanceModal(false)} />
      )}
    </div>
  );
}

function PasswordChangeModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-surface-dark rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Change Password</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {success ? (
          <p className="text-center text-green-600 font-medium py-4">
            Password changed successfully!
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-10 rounded-xl bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Enter current password"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-10 rounded-xl bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Enter new password"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Confirm new password"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full py-3 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function AppearanceModal({ onClose }: { onClose: () => void }) {
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window === "undefined") return "system";
    return localStorage.getItem("uds_theme") || "system";
  });

  const applyTheme = (value: string) => {
    setTheme(value);
    localStorage.setItem("uds_theme", value);
    const html = document.documentElement;
    if (value === "dark") {
      html.classList.add("dark");
    } else if (value === "light") {
      html.classList.remove("dark");
    } else {
      // System preference
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
      }
    }
    onClose();
  };

  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-surface-dark rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Appearance</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="space-y-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => applyTheme(opt.value)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                theme === opt.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <opt.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
