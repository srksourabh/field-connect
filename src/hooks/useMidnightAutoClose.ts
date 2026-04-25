"use client";

import { useEffect, useRef } from "react";
import { todayIST } from "@/lib/utils";

/**
 * Detects IST midnight (day change) and calls onMidnight callback.
 * Uses setTimeout for precise scheduling + 60s interval as backup
 * (handles cases where the browser suspends timers in background tabs).
 */
export function useMidnightAutoClose(
  userId: string,
  isPunchedIn: boolean,
  onMidnight: () => void
) {
  const lastDateRef = useRef(todayIST());

  useEffect(() => {
    if (!userId) return;

    lastDateRef.current = todayIST();

    function checkDayChange() {
      const now = todayIST();
      if (now !== lastDateRef.current) {
        lastDateRef.current = now;
        onMidnight();
      }
    }

    // Schedule a timeout for IST midnight (00:00:05 IST to avoid edge cases)
    function scheduleNextMidnight() {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
      const nowIST = new Date(now.getTime() + istOffset);
      const tomorrowIST = new Date(nowIST);
      tomorrowIST.setUTCHours(0, 0, 5, 0); // 00:00:05 IST
      tomorrowIST.setUTCDate(tomorrowIST.getUTCDate() + 1);
      const msUntilMidnight = tomorrowIST.getTime() - nowIST.getTime();
      return setTimeout(() => {
        checkDayChange();
        // Re-schedule for next midnight
        midnightTimer = scheduleNextMidnight();
      }, msUntilMidnight);
    }

    let midnightTimer = scheduleNextMidnight();

    // Backup: check every 60s (catches suspended tabs that missed the timeout)
    const intervalId = setInterval(checkDayChange, 60000);

    // Also check when tab becomes visible again (after being in background)
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        checkDayChange();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearTimeout(midnightTimer);
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [userId, isPunchedIn, onMidnight]);
}
