"use client";

import { useEffect, useRef } from "react";
import { insertLocationLog } from "@/lib/location-api";
import { addToQueue } from "@/lib/sync-queue";
import { todayIST } from "@/lib/utils";

// Scheduled capture times (HH:MM in 24h)
const SCHEDULE = ["09:30", "10:00", "13:00", "16:00", "19:00"];
const TOLERANCE_MINUTES = 5;

function todayKey(): string {
  return `uds_location_captured_${todayIST()}`;
}

function getCapturedSlots(): Set<string> {
  try {
    const stored = localStorage.getItem(todayKey());
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function markSlotCaptured(slot: string) {
  const captured = getCapturedSlots();
  captured.add(slot);
  localStorage.setItem(todayKey(), JSON.stringify(Array.from(captured)));
}

function isWithinSchedule(now: Date): string | null {
  // Use IST time regardless of device timezone
  const istStr = now.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
  const [hh, mm] = istStr.split(":").map(Number);
  const nowMinutes = hh * 60 + mm;

  for (const slot of SCHEDULE) {
    const [sh, sm] = slot.split(":").map(Number);
    const slotMinutes = sh * 60 + sm;
    if (Math.abs(nowMinutes - slotMinutes) <= TOLERANCE_MINUTES) {
      return slot;
    }
  }
  return null;
}

export function useLocationTracker(
  isPunchedIn: boolean,
  userId: string,
  attendanceId?: string | null,
  isOnline?: boolean
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isPunchedIn || !userId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Check every 60 seconds if we're within a scheduled capture window
    const check = () => {
      const now = new Date();
      const slot = isWithinSchedule(now);
      if (!slot) return;

      const captured = getCapturedSlots();
      if (captured.has(slot)) return;

      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          markSlotCaptured(slot);

          if (isOnline !== false) {
            await insertLocationLog({
              user_id: userId,
              attendance_id: attendanceId ?? null,
              lat: latitude,
              long: longitude,
              source: "scheduled",
            });
          } else {
            addToQueue({
              id: crypto.randomUUID(),
              type: "location_log",
              payload: {
                user_id: userId,
                attendance_id: attendanceId ?? null,
                lat: latitude,
                long: longitude,
                source: "scheduled",
              },
              timestamp: now.toISOString(),
            });
          }
        },
        (err) => {
          console.error("Scheduled location capture failed:", err.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    // Check immediately on mount, then every 60s
    check();
    intervalRef.current = setInterval(check, 60_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPunchedIn, userId, attendanceId, isOnline]);
}
