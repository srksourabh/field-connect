"use client";

interface EmployeeMarkerProps {
  name: string;
  status: "online" | "away" | "offline";
}

export default function EmployeeMarker({ name, status }: EmployeeMarkerProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const pulseColor = status === "online" ? "bg-primary" : status === "away" ? "bg-yellow-500" : "bg-gray-500";

  return (
    <div className="relative flex flex-col items-center">
      {/* Pulse ring */}
      {status === "online" && (
        <div className="absolute -inset-2">
          <div className={`w-full h-full rounded-full ${pulseColor}/30 animate-pulse-ring`} />
        </div>
      )}
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-white dark:bg-surface-dark border-2 border-primary flex items-center justify-center text-xs font-bold text-primary shadow-lg z-10">
        {initials}
      </div>
      {/* Name tag */}
      <div className="mt-1 px-2 py-0.5 bg-white dark:bg-surface-dark rounded text-[10px] font-medium shadow-sm whitespace-nowrap">
        {name.split(" ")[0]}
      </div>
    </div>
  );
}
