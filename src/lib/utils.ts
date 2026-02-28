import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Returns YYYY-MM-DD in IST for any Date */
export function toISTDateStr(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** Returns today's date as YYYY-MM-DD in IST */
export function todayIST(): string {
  return toISTDateStr(new Date());
}

/** Returns today's IST midnight as a full ISO timestamp with offset (for Supabase queries) */
export function todayISTTimestamp(): string {
  return `${todayIST()}T00:00:00+05:30`;
}

/** Returns end-of-day IST timestamp for a given date string (YYYY-MM-DD) */
export function endOfDayIST(dateStr: string): string {
  return `${dateStr}T23:59:59+05:30`;
}

/** Auto-close timestamp: 23:59:00 IST for a given date (used for stale session closure) */
export function autoCloseIST(dateStr: string): string {
  return `${dateStr}T23:59:00+05:30`;
}

/** Check if a punch-out time matches the auto-close time (23:59 IST) */
export function isAutoCloseTime(punchOutAt: string): boolean {
  const t = new Date(punchOutAt).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
  return t === "23:59";
}

/** Calculate inclusive leave days between two YYYY-MM-DD date strings (timezone-safe) */
export function calcLeaveDays(startDate: string, endDate: string): number {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const start = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

/** Log errors only in development — suppressed in production to avoid leaking internals */
export function logError(message: string, ...args: unknown[]): void {
  if (process.env.NODE_ENV !== "production") {
    console.error(message, ...args);
  }
}
