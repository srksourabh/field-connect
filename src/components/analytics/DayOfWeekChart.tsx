"use client";

interface DayOfWeekChartProps {
  data: { day: string; avgPresent: number; avgHours: number; totalRecords: number }[];
}

export default function DayOfWeekChart({ data }: DayOfWeekChartProps) {
  if (!data || data.length === 0) return null;
  const maxHours = Math.max(...data.map((d) => d.avgHours), 1);

  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 p-4">
      <h3 className="text-sm font-semibold mb-3">Day of Week Pattern</h3>
      <div className="flex items-end gap-2 h-28">
        {data.map((d) => {
          const height = d.avgHours > 0 ? Math.max((d.avgHours / maxHours) * 100, 8) : 0;
          const isWeekend = d.day === "Sun" || d.day === "Sat";
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-gray-500 font-medium">{d.avgHours > 0 ? `${d.avgHours}h` : ""}</span>
              <div
                className={`w-full rounded-t-md transition-all ${
                  isWeekend
                    ? "bg-gray-200 dark:bg-gray-700"
                    : d.avgHours >= 6
                      ? "bg-primary"
                      : d.avgHours >= 4
                        ? "bg-amber-400"
                        : "bg-red-400"
                }`}
                style={{ height: `${height}%` }}
              />
              <span className={`text-[10px] font-medium ${isWeekend ? "text-gray-400" : "text-gray-600 dark:text-gray-300"}`}>
                {d.day}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-400 mt-2">Average hours per punch-in record by day</p>
    </div>
  );
}
