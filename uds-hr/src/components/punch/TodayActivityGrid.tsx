"use client";

import { useRouter } from "next/navigation";
import { LogIn, Timer, Navigation, TreePalm, Repeat } from "lucide-react";
import { formatTime } from "@/lib/utils";

export interface LeaveInfo {
  sickRemaining: number;
  casualRemaining: number;
  privilegeRemaining: number;
  pending: number;
}

interface TodayActivityGridProps {
  punchInTime: string | null;
  elapsedSeconds: number;
  punchOutTime?: string | null;
  distanceKm?: number;
  leaveInfo?: LeaveInfo | null;
  sessionCount?: number;
}

export default function TodayActivityGrid({
  punchInTime,
  elapsedSeconds,
  distanceKm = 0,
  leaveInfo,
  sessionCount = 0,
}: TodayActivityGridProps) {
  const router = useRouter();
  const punchInDate = punchInTime ? new Date(punchInTime) : null;

  const hours = Math.floor(elapsedSeconds / 3600);
  const mins = Math.floor((elapsedSeconds % 3600) / 60);
  const totalStr = elapsedSeconds > 0 ? `${hours}h ${mins}m` : "--";

  const leaveValue = leaveInfo
    ? `SL:${leaveInfo.sickRemaining} CL:${leaveInfo.casualRemaining}${leaveInfo.privilegeRemaining > 0 ? ` PL:${leaveInfo.privilegeRemaining}` : ""}`
    : "--";
  const leaveSuffix = leaveInfo && leaveInfo.pending > 0
    ? `${leaveInfo.pending} pending`
    : "";

  const cards: {
    icon: typeof LogIn;
    iconColor: string;
    iconBg: string;
    label: string;
    value: string;
    suffix: string;
    onClick?: () => void;
  }[] = [
    {
      icon: LogIn,
      iconColor: "text-primary/80",
      iconBg: "bg-primary/10",
      label: "Start",
      value: punchInDate ? formatTime(punchInDate) : "--:--",
      suffix: punchInDate
        ? punchInDate.getHours() < 12
          ? "AM"
          : "PM"
        : "",
    },
    {
      icon: TreePalm,
      iconColor: "text-orange-500/80",
      iconBg: "bg-orange-500/10",
      label: "Leaves",
      value: leaveValue,
      suffix: leaveSuffix,
      onClick: () => router.push("/dashboard/leave"),
    },
    {
      icon: Timer,
      iconColor: "text-purple-500/80",
      iconBg: "bg-purple-500/10",
      label: "Total",
      value: totalStr,
      suffix: "",
    },
    {
      icon: Navigation,
      iconColor: "text-emerald-500/80",
      iconBg: "bg-emerald-500/10",
      label: "KM Today",
      value: distanceKm > 0 ? distanceKm.toFixed(1) : "0",
      suffix: "km",
    },
    {
      icon: Repeat,
      iconColor: "text-indigo-500/80",
      iconBg: "bg-indigo-500/10",
      label: "Sessions",
      value: String(sessionCount),
      suffix: "",
    },
  ];

  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
        Today&apos;s Activity
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card, i) => (
          <div
            key={card.label}
            role={card.onClick ? "button" : undefined}
            tabIndex={card.onClick ? 0 : undefined}
            onClick={card.onClick}
            onKeyDown={card.onClick ? (e) => { if (e.key === "Enter") card.onClick!(); } : undefined}
            className={`bg-white dark:bg-surface-dark p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 flex flex-col justify-between h-24 ${
              card.onClick ? "cursor-pointer hover:border-primary/40 transition-colors" : ""
            } ${i === cards.length - 1 && cards.length % 2 !== 0 ? "col-span-2" : ""}`}
          >
            <div className="flex justify-between items-start">
              <div className={`${card.iconBg} p-1.5 rounded-lg`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <span className="text-xs text-slate-400 font-medium">{card.label}</span>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800 dark:text-white">
                {card.value}{" "}
                {card.suffix && (
                  <span className="text-xs font-normal text-slate-500">
                    {card.suffix}
                  </span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
