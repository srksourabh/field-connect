"use client";

interface WeeklyComparisonProps {
  data: { week: string; presentCount: number; avgHours: number }[];
}

export default function WeeklyComparison({ data }: WeeklyComparisonProps) {
  if (!data || data.length === 0) return null;
  const maxPresent = Math.max(...data.map((d) => d.presentCount), 1);

  const formatWeek = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00+05:30");
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" });
  };

  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 p-4">
      <h3 className="text-sm font-semibold mb-3">Weekly Comparison</h3>
      <div className="space-y-2">
        {data.map((w, i) => {
          const prev = i > 0 ? data[i - 1] : null;
          const hoursDiff = prev ? w.avgHours - prev.avgHours : 0;
          return (
            <div key={w.week} className="flex items-center gap-3">
              <span className="text-[11px] text-gray-500 w-16 shrink-0">Wk {formatWeek(w.week)}</span>
              <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/80 rounded-full transition-all flex items-center justify-end pr-2"
                  style={{ width: `${Math.max((w.presentCount / maxPresent) * 100, 10)}%` }}
                >
                  <span className="text-[10px] text-white font-medium">{w.presentCount}</span>
                </div>
              </div>
              <div className="text-right w-16 shrink-0">
                <span className="text-xs font-medium">{w.avgHours}h</span>
                {hoursDiff !== 0 && (
                  <span className={`text-[10px] ml-1 ${hoursDiff > 0 ? "text-green-500" : "text-red-500"}`}>
                    {hoursDiff > 0 ? "+" : ""}{hoursDiff.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-400 mt-2">Unique employees present per week &middot; avg hours per person</p>
    </div>
  );
}
