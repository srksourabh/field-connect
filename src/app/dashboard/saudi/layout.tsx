"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarCheck,
  Wallet,
  ShieldCheck,
  FileText,
  ChevronLeft,
} from "lucide-react";

const navItems = [
  { href: "/dashboard/saudi", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/saudi/employees", label: "Employees", icon: Users },
  { href: "/dashboard/saudi/departments", label: "Departments", icon: Building2 },
  { href: "/dashboard/saudi/leave", label: "Leave", icon: CalendarCheck },
  { href: "/dashboard/saudi/payroll", label: "Payroll", icon: Wallet },
  { href: "/dashboard/saudi/compliance", label: "Compliance", icon: ShieldCheck },
];

export default function SaudiLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full">
      <aside className="hidden lg:flex w-64 flex-col border-r border-gray-200 dark:border-gray-700/50 bg-white dark:bg-surface-dark">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700/50">
          <Link
            href="/dashboard/saudi"
            className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            <FileText className="w-5 h-5 text-primary" />
            Saudi Module
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700/50">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to HR
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
