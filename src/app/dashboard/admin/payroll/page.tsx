"use client";

import { ChevronLeft, ChevronRight, Layers, Users, Play, FileText } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

const sections = [
  { icon: Layers, label: "Salary Components", description: "Manage earning & deduction types", href: "/dashboard/admin/payroll/components", color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" },
  { icon: Users, label: "Employee Salary", description: "Assign salary to employees", href: "/dashboard/admin/payroll/salary", color: "text-green-500 bg-green-50 dark:bg-green-900/20" },
  { icon: Play, label: "Run Payroll", description: "Process monthly payroll", href: "/dashboard/admin/payroll/run", color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20", disabled: true },
  { icon: FileText, label: "Payslips", description: "View generated payslips", href: "/dashboard/admin/payroll/payslip", color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20", disabled: true },
];

export default function PayrollHubPage() {
  const { profile } = useAuth();

  const hasAccess = profile?.role === "super_admin" ||
    (profile?.designation?.toLowerCase().includes("hr") &&
      ["admin", "super_admin"].includes(profile?.role || ""));

  if (profile && !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <h1 className="text-lg font-semibold mb-2">Access Denied</h1>
        <p className="text-sm text-gray-500 text-center mb-4">Only super admins and HR can access payroll.</p>
        <Link href="/dashboard" className="text-primary text-sm font-medium">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="pt-12 pb-4 px-6 flex items-center justify-between bg-white/50 dark:bg-[#151f2b] backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
        <Link href="/dashboard/organisation" className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-lg font-semibold text-center flex-1">Payroll</h1>
        <div className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-6 space-y-2">
        {sections.map((item) => {
          const Wrapper = (item as { disabled?: boolean }).disabled ? "div" : Link;
          return (
            <Wrapper
              key={item.label}
              href={(item as { disabled?: boolean }).disabled ? "#" : item.href}
              className={`flex items-center justify-between p-4 bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 transition-colors ${
                (item as { disabled?: boolean }).disabled
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-medium block">{item.label}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{item.description}</span>
                  {(item as { disabled?: boolean }).disabled && (
                    <span className="text-[10px] text-gray-400 block">Coming in Phase C/D</span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
