"use client";

import { useState, useEffect } from "react";
import BottomNav from "@/components/ui/BottomNav";
import MobileShell from "@/components/ui/MobileShell";
import DesktopNav from "@/components/ui/DesktopNav";
import Sidebar from "@/components/ui/Sidebar";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Menu } from "lucide-react";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/login";
    }
  }, [loading, user]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthProvider>
      <AuthGuard>
        {/* Desktop top nav — visible on lg+ */}
        <DesktopNav />

        {/* Mobile hamburger in top-left — visible on mobile only */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-3 left-3 z-40 p-2 rounded-lg bg-white/80 dark:bg-surface-dark/80 backdrop-blur border border-gray-200 dark:border-gray-700/50 shadow-sm lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>

        {/* Sidebar drawer */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <MobileShell>
          <main className="overflow-y-auto pb-24 lg:pb-8">{children}</main>
          <BottomNav />
        </MobileShell>
      </AuthGuard>
    </AuthProvider>
  );
}
