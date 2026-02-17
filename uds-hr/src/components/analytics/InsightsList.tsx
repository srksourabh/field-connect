"use client";

import { AlertTriangle, TrendingUp, Info } from "lucide-react";

interface Insight {
  type: "warning" | "positive" | "info";
  text: string;
}

interface InsightsListProps {
  insights: Insight[];
}

export default function InsightsList({ insights }: InsightsListProps) {
  if (insights.length === 0) return null;

  const iconMap = {
    warning: AlertTriangle,
    positive: TrendingUp,
    info: Info,
  };

  const colorMap = {
    warning: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300",
    positive: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300",
    info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300",
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Insights</h3>
      {insights.map((insight, i) => {
        const Icon = iconMap[insight.type];
        return (
          <div
            key={i}
            className={`flex items-start gap-3 p-3 rounded-xl border ${colorMap[insight.type]}`}
          >
            <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{insight.text}</p>
          </div>
        );
      })}
    </div>
  );
}
