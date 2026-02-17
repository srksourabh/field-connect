"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, CalendarDays, TreePalm, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard/attendance", icon: CalendarDays, label: "Attendance" },
  { href: "/dashboard/leave", icon: TreePalm, label: "Leave" },
  { href: "/dashboard", icon: Home, label: "Home", isFab: true },
  { href: "/dashboard/team", icon: Users, label: "Team" },
  { href: "/dashboard/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-surface-dark/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 safe-bottom lg:hidden">
      <div className="max-w-md mx-auto flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          if (tab.isFab) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center justify-center -mt-6"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center shadow-lg shadow-primary/40">
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[60px] py-1",
                isActive
                  ? "text-primary"
                  : "text-gray-400 dark:text-gray-500"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
