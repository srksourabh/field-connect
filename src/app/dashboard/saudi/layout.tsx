"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarCheck,
  Wallet,
  ShieldCheck,
  ChevronLeft,
} from "lucide-react";

const navItems = [
  { href: "/dashboard/saudi", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/saudi/employees", label: "Employees", icon: Users },
  { href: "/dashboard/saudi/departments", label: "Departments", icon: Building2 },
  { href: "/dashboard/saudi/leave", label: "Leave", icon: CalendarCheck },
  { href: "/dashboard/saudi/payroll", label: "Payroll", icon: Wallet },
  { href: "/dashboard/saudi/compliance", label: "Compliance", icon: ShieldCheck },
];

export default function SaudiLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const displayName = profile?.full_name ?? user?.email?.split("@")[0] ?? "User";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-forest">
      {/* Top Navigation */}
      <header className="w-full h-24 flex items-center px-10 text-white z-50">
        <div className="flex items-center gap-2 mr-12">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <LayoutDashboard className="text-gold text-xl" />
          </div>
          <span className="text-2xl font-bold tracking-tight font-satoshi">ZenHR</span>
        </div>

        <nav className="flex-1 flex items-center gap-8">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "bg-white/10 text-white border border-gold/50 px-6 py-2.5 rounded-full flex items-center gap-2 font-medium"
                    : "flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                }
              >
                <Icon className="text-xl" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            India HR
          </Link>
          <div className="w-10 h-10 rounded-full bg-white/20 overflow-hidden border-2 border-white/40 flex items-center justify-center text-sm font-bold text-white">
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt="" width={40} height={40} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-container flex-1 p-10" style={{
        background: "linear-gradient(135deg, #f8fafb 0%, #ffffff 100%)",
        borderRadius: "40px 0 0 0",
        minHeight: "calc(100vh - 96px)",
      }}>
        {children}
      </main>

      <style jsx global>{`
        body {
          font-family: 'Satoshi', 'Inter', system-ui, sans-serif;
          background-color: #1b4d3e;
        }
        .kpi-circle {
          width: 56px;
          height: 56px;
          border-radius: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(212, 175, 55, 0.2);
        }
        .chart-grid-tile {
          height: 48px;
          border-radius: 8px;
          opacity: 0.8;
        }
        .progress-bar-gold {
          background: linear-gradient(90deg, #e8d5b7 0%, #d4af37 100%);
        }
        .progress-bar-sage {
          background: linear-gradient(90deg, #f0f5f2 0%, #1b4d3e 100%);
        }
      `}</style>
    </div>
  );
}
