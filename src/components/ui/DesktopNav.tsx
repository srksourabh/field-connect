"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  CalendarDays,
  TreePalm,
  Users,
  FileBarChart,
  CheckSquare,
  Shield,
  BarChart3,
  Map,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import NotificationDropdown from "@/components/ui/NotificationDropdown";
import Image from "next/image";

const navLinks = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/dashboard/attendance", icon: CalendarDays, label: "Attendance" },
  { href: "/dashboard/leave", icon: TreePalm, label: "Leave" },
  { href: "/dashboard/team", icon: Users, label: "Team" },
  { href: "/dashboard/reports", icon: FileBarChart, label: "Reports" },
];

export default function DesktopNav() {
  const pathname = usePathname();
  const { profile } = useAuth();

  const role = profile?.role || "employee";
  const displayName = profile?.full_name ?? "User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const allLinks = [
    ...navLinks,
    ...(["manager", "admin", "super_admin"].includes(role)
      ? [
          { href: "/dashboard/team/approvals", icon: CheckSquare, label: "Approvals" },
          { href: "/dashboard/analytics", icon: BarChart3, label: "Analytics" },
        ]
      : []),
    ...(["admin", "super_admin"].includes(role)
      ? [
          { href: "/dashboard/admin", icon: Shield, label: "Admin" },
          { href: "/dashboard/admin/map", icon: Map, label: "Map" },
        ]
      : []),
  ];

  return (
    <header className="hidden lg:flex items-center justify-between h-16 px-8 bg-white dark:bg-[#101922] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center">
          <span className="text-white font-bold text-sm">U</span>
        </div>
        <span className="text-lg font-bold">Field Connect</span>
      </Link>

      {/* Nav links */}
      <nav className="flex items-center gap-1">
        {allLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <Icon className="w-4 h-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <NotificationDropdown />
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {profile?.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={displayName}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
              {initials}
            </div>
          )}
          <span className="text-sm font-medium hidden xl:block">{displayName}</span>
        </Link>
      </div>
    </header>
  );
}
