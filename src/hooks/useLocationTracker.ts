"use client";

import { useEffect, useRef } from "react";
import { insertLocationLog } from "@/lib/location-api";
import { addToQueue } from "@/lib/sync-queue";
import { todayIST, logError } from "@/lib/utils";

// Continuous capture interval (15 minutes) while punched in
const CAPTURE_INTERVAL_MS = 15 * 60 * 1000;

function todayKey(): string {
  return `fieldconnect_location_captured_${todayIST()}`;
}

function getLastCaptureTime(): number {
  try {
    const stored = localStorage.getItem(`${todayKey()}_last`);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

function setLastCaptureTime(time: number) {
  localStorage.setItem(`${todayKey()}_last`, String(time));
}

function captureLocation(
  userId: string,
  attendanceId: string | null | undefined,
  isOnline: boolean | undefined
) {
  if (!navigator.geolocation) return;

  const saveLocation = async (latitude: number, longitude: number) => {
    if (isOnline !== false) {
      try {
        await insertLocationLog({
          user_id: userId,
          attendance_id: attendanceId ?? null,
          lat: latitude,
          long: longitude,
          source: "scheduled",
        });
        setLastCaptureTime(Date.now());
      } catch (e) {
        logError("Location log failed:", e);
      }
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
        timestamp: new Date().toISOString(),
      });
      setLastCaptureTime(Date.now());
    }
  };

  navigator.geolocation.getCurrentPosition(
    (position) => { saveLocation(position.coords.latitude, position.coords.longitude); },
    (err) => {
      // Retry with low accuracy if high accuracy fails (e.g. GPS timeout on mobile)
      if (err.code === err.TIMEOUT) {
        navigator.geolocation.getCurrentPosition(
          (position) => { saveLocation(position.coords.latitude, position.coords.longitude); },
          (retryErr) => { logError("Location capture retry failed:", retryErr.message); },
          { enableHighAccuracy: false, timeout: 15000 }
        );
      } else {
        logError("Location capture failed:", err.message);
      }
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
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

    // Capture every 15 minutes while punched in
    const check = () => {
      const lastCapture = getLastCaptureTime();
      const elapsed = Date.now() - lastCapture;

      // Only capture if at least 15 minutes since last capture
      if (elapsed >= CAPTURE_INTERVAL_MS) {
        captureLocation(userId, attendanceId, isOnline);
      }
    };

    // Capture immediately on punch-in, then check every 60s
    captureLocation(userId, attendanceId, isOnline);
    intervalRef.current = setInterval(check, 60_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPunchedIn, userId, attendanceId, isOnline]);
}
