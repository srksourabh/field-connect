"use client";

import { Building2, FolderKanban } from "lucide-react";

interface BreakdownItem {
  name: string;
  employees: number;
  avgHours: number;
  latePercent: number;
}

interface BreakdownCardsProps {
  title: string;
  type: "project" | "department";
  data: BreakdownItem[];
}

export default function BreakdownCards({ title, type, data }: BreakdownCardsProps) {
  if (!data || data.length === 0) return null;
  const Icon = type === "project" ? FolderKanban : Building2;

  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 p-4">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.name}</p>
              <p className="text-[11px] text-gray-500">{item.employees} employee{item.employees !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className={`text-sm font-semibold ${item.avgHours >= 6 ? "text-green-600" : item.avgHours >= 4 ? "text-amber-600" : "text-red-500"}`}>
                  {item.avgHours}h
                </p>
                <p className="text-[10px] text-gray-400">avg</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${item.latePercent <= 20 ? "text-green-600" : item.latePercent <= 40 ? "text-amber-600" : "text-red-500"}`}>
                  {item.latePercent}%
                </p>
                <p className="text-[10px] text-gray-400">late</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
