"use client";

import { Clock, CheckCircle, Users } from "lucide-react";

interface ApprovalSummaryCardsProps {
  pending: number;
  approved: number;
  teamCapacity: number;
}

export default function ApprovalSummaryCards({
  pending,
  approved,
  teamCapacity,
}: ApprovalSummaryCardsProps) {
  const cards = [
    {
      icon: Clock,
      label: "Pending",
      value: pending,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10",
    },
    {
      icon: CheckCircle,
      label: "Approved",
      value: approved,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
    },
    {
      icon: Users,
      label: "Capacity",
      value: `${teamCapacity}%`,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 px-6 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white dark:bg-surface-dark rounded-xl p-3 border border-gray-100 dark:border-gray-700/50 text-center"
        >
          <div className={`${card.iconBg} w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2`}>
            <card.icon className={`w-4 h-4 ${card.iconColor}`} />
          </div>
          <p className="text-lg font-bold">{card.value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
