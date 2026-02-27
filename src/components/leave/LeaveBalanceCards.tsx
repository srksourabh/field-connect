"use client";

import { useState, useEffect } from "react";
import { Pill, Umbrella, Clock, Award } from "lucide-react";
import type { HrLeaveBalance } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

interface LeaveBalanceCardsProps {
  balance: HrLeaveBalance | null;
}

export default function LeaveBalanceCards({ balance }: LeaveBalanceCardsProps) {
  const [policyUrl, setPolicyUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("hr_config")
        .select("value")
        .eq("key", "leave_policy_url")
        .single();
      if (data?.value) setPolicyUrl(data.value);
    })();
  }, []);

  const privilegeTotal = balance?.privilege_leave_total ?? 0;

  const cards = [
    {
      label: "Sick Leave",
      icon: Pill,
      iconColor: "text-red-600 dark:text-red-400",
      iconBg: "bg-red-100 dark:bg-red-500/20",
      barColor: "bg-red-500",
      used: balance?.sick_leave_used ?? 0,
      total: balance?.sick_leave_total ?? 10,
    },
    {
      label: "Casual Leave",
      icon: Umbrella,
      iconColor: "text-primary",
      iconBg: "bg-primary/20",
      barColor: "bg-primary",
      used: balance?.casual_leave_used ?? 0,
      total: balance?.casual_leave_total ?? 5,
    },
    // Only show Privilege Leave card if admin has enabled it (total > 0)
    ...(privilegeTotal > 0
      ? [
          {
            label: "Privilege",
            icon: Award,
            iconColor: "text-purple-600 dark:text-purple-400",
            iconBg: "bg-purple-100 dark:bg-purple-500/20",
            barColor: "bg-purple-500",
            used: balance?.privilege_leave_used ?? 0,
            total: privilegeTotal,
          },
        ]
      : []),
    {
      label: "Comp-Off",
      icon: Clock,
      iconColor: "text-green-600 dark:text-green-400",
      iconBg: "bg-green-100 dark:bg-green-500/20",
      barColor: "bg-green-500",
      used: balance?.compoff_used ?? 0,
      total: balance?.compoff_total ?? 0,
    },
  ];

  return (
    <section className="mt-6 mb-8 px-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          My Balances
        </h2>
        {policyUrl ? (
          <a
            href={policyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary cursor-pointer hover:underline"
          >
            View Policy
          </a>
        ) : (
          <span className="text-xs text-gray-400">View Policy</span>
        )}
      </div>
      <div className="flex space-x-4 overflow-x-auto no-scrollbar pb-2 -mx-6 px-6 snap-x snap-mandatory">
        {cards.map((card) => {
          const remaining = card.total - card.used;
          const pct = card.total > 0 ? (card.used / card.total) * 100 : 0;

          return (
            <div
              key={card.label}
              className="snap-center shrink-0 w-40 bg-white dark:bg-[#1c2a36] rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
              <div className="relative z-10">
                <div
                  className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center mb-3`}
                >
                  <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                  {card.label}
                </p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {remaining}
                  </span>
                  <span className="text-xs text-gray-400">/ {card.total} days</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className={`${card.barColor} h-full rounded-full`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
