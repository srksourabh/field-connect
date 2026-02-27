"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  X,
  Home,
  CalendarDays,
  TreePalm,
  Users,
  User,
  FileBarChart,
  QrCode,
  ClipboardList,
  CheckSquare,

  LogOut,
  BarChart3,
  Map,
  UserPlus,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  href: string;
  icon: typeof Home;
  label: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/dashboard/attendance", icon: CalendarDays, label: "Attendance" },
  { href: "/dashboard/leave", icon: TreePalm, label: "Leave" },
  { href: "/dashboard/team", icon: Users, label: "Team" },
  { href: "/dashboard/reports", icon: FileBarChart, label: "Reports" },
  { href: "/dashboard/onboarding", icon: ClipboardList, label: "Onboarding" },
  { href: "/dashboard/qr", icon: QrCode, label: "QR Scanner" },
  { href: "/dashboard/profile", icon: User, label: "Profile" },
];

const managerItems: NavItem[] = [
  { href: "/dashboard/team/approvals", icon: CheckSquare, label: "Approvals", roles: ["manager", "admin"] },
  { href: "/dashboard/analytics", icon: BarChart3, label: "Analytics", roles: ["manager", "admin"] },
];

const adminItems: NavItem[] = [
  { href: "/dashboard/admin/employees", icon: UserPlus, label: "Add Employee", roles: ["admin"] },
  { href: "/dashboard/admin/leaves", icon: TreePalm, label: "Leave Allotment", roles: ["admin"] },
  { href: "/dashboard/admin/map", icon: Map, label: "Team Map", roles: ["admin"] },
  { href: "/dashboard/admin/notifications", icon: Megaphone, label: "Broadcast", roles: ["admin"] },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const role = profile?.role || "employee";
  const displayName = profile?.full_name ?? "User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const allItems = [
    ...navItems,
    ...(["manager", "admin", "super_admin"].includes(role) ? managerItems : []),
    ...(["admin", "super_admin"].includes(role) ? adminItems : []),
  ];

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-50 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={sidebarRef}
        className={cn(
          "fixed top-0 left-0 h-full w-72 bg-white dark:bg-[#101922] z-50 shadow-2xl transition-transform duration-300 flex flex-col",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* User section */}
        <div className="p-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={displayName}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  {initials}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold">{displayName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{role}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-2">
          {allItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 mx-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={async () => {
              await signOut();
              onClose();
            }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
