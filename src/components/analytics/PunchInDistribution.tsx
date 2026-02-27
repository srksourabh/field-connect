"use client";

interface PunchInDistributionProps {
  data: { hour: number; count: number }[];
}

export default function PunchInDistribution({ data }: PunchInDistributionProps) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.count), 1);

  const formatHour = (h: number) => {
    if (h === 0) return "12 AM";
    if (h < 12) return `${h} AM`;
    if (h === 12) return "12 PM";
    return `${h - 12} PM`;
  };

  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700/50 p-4">
      <h3 className="text-sm font-semibold mb-3">Punch-In Time Distribution</h3>
      <div className="space-y-1.5">
        {data.map((d) => (
          <div key={d.hour} className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500 w-12 text-right shrink-0">{formatHour(d.hour)}</span>
            <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  d.hour < 10 ? "bg-green-500" : d.hour < 11 ? "bg-amber-500" : "bg-red-400"
                }`}
                style={{ width: `${(d.count / max) * 100}%` }}
              />
            </div>
            <span className="text-[11px] text-gray-500 w-8 shrink-0">{d.count}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-400">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Before 10 AM</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> 10-11 AM</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400" /> After 11 AM</div>
      </div>
    </div>
  );
}
