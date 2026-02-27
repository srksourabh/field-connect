"use client";

import { Users, UserCheck, UserX, MapPin } from "lucide-react";

interface SummaryCardsProps {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  onLeaveToday: number;
  inFieldNow: number;
}

export default function SummaryCards({ totalEmployees, presentToday, onLeaveToday, inFieldNow }: SummaryCardsProps) {
  const cards = [
    { icon: Users, label: "Total", value: totalEmployees, color: "text-primary", bg: "bg-primary/10" },
    { icon: UserCheck, label: "Present", value: presentToday, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/20" },
    { icon: UserX, label: "On Leave", value: onLeaveToday, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/20" },
    { icon: MapPin, label: "In Field", value: inFieldNow, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/20" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 p-4"
        >
          <div className={`${card.bg} w-8 h-8 rounded-lg flex items-center justify-center mb-2`}>
            <card.icon className={`w-4 h-4 ${card.color}`} />
          </div>
          <p className="text-2xl font-bold">{card.value}</p>
          <p className="text-xs text-gray-500">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
