"use client";

interface TrendPoint {
  date: string;
  count: number;
}

interface AttendanceTrendChartProps {
  data: TrendPoint[];
  maxEmployees: number;
}

export default function AttendanceTrendChart({ data, maxEmployees }: AttendanceTrendChartProps) {
  if (data.length === 0) return null;

  const max = Math.max(maxEmployees, ...data.map((d) => d.count), 1);

  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 p-4">
      <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-200">
        Daily Attendance Trend
      </h3>
      <div className="flex items-end gap-1 h-32">
        {data.map((point) => {
          const height = max > 0 ? (point.count / max) * 100 : 0;
          const dayNum = new Date(point.date).getDate();

          return (
            <div key={point.date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
              {/* Tooltip */}
              <div className="absolute -top-6 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                {point.count} present
              </div>
              {/* Bar */}
              <div
                className="w-full rounded-t bg-primary/70 hover:bg-primary transition-colors min-h-[2px]"
                style={{ height: `${Math.max(height, 2)}%` }}
              />
              {/* Label — show every few days to avoid crowding */}
              {(data.length <= 15 || dayNum % 5 === 1 || dayNum === 1) && (
                <span className="text-[9px] text-gray-400 mt-1">{dayNum}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
