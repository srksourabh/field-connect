"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { todayIST } from "@/lib/utils";

interface PunchState {
  isPunchedIn: boolean;
  punchInTime: string | null;
  elapsedSeconds: number;
  cumulativeSeconds: number;
  sessionCount: number;
  lastResetDate: string; // YYYY-MM-DD
  autoClosedYesterday: boolean;
}

function todayStr(): string {
  return todayIST();
}

function defaultState(): PunchState {
  return {
    isPunchedIn: false,
    punchInTime: null,
    elapsedSeconds: 0,
    cumulativeSeconds: 0,
    sessionCount: 0,
    lastResetDate: todayStr(),
    autoClosedYesterday: false,
  };
}

function storageKey(userId: string): string {
  return `uds_punch_state_${userId}`;
}

function loadState(userId: string): PunchState {
  if (typeof window === "undefined" || !userId) return defaultState();
  try {
    const stored = localStorage.getItem(storageKey(userId));
    if (stored) {
      const parsed = JSON.parse(stored) as PunchState;
      // Day change — reset cumulative, flag auto-close if was punched in
      if (parsed.lastResetDate !== todayStr()) {
        return {
          ...defaultState(),
          isPunchedIn: false,
          punchInTime: null,
          autoClosedYesterday: parsed.isPunchedIn,
        };
      }
      return { ...defaultState(), ...parsed };
    }
  } catch {
    // Ignore parse errors
  }
  return defaultState();
}

function saveState(userId: string, state: PunchState) {
  if (!userId) return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export function usePunchState(userId: string) {
  // Start with default state — do NOT load from localStorage eagerly.
  // State is only set after server sync (or offline fallback via initFromCache).
  const [state, setState] = useState<PunchState>(defaultState);
  const [isReady, setIsReady] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevUserRef = useRef<string>("");

  // When userId changes, reset to default (don't load localStorage yet)
  useEffect(() => {
    if (prevUserRef.current === userId) return;
    prevUserRef.current = userId;

    if (!userId) {
      setState(defaultState());
      setIsReady(false);
    }
    // Don't load from localStorage here — wait for server sync or explicit initFromCache
  }, [userId]);

  // Timer tick — counts current session elapsed
  useEffect(() => {
    if (state.isPunchedIn && state.punchInTime) {
      intervalRef.current = setInterval(() => {
        const start = new Date(state.punchInTime!).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - start) / 1000);
        setState((prev) => {
          const next = { ...prev, elapsedSeconds: elapsed };
          saveState(userId, next);
          return next;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isPunchedIn, state.punchInTime, userId]);

  const punchIn = useCallback(() => {
    const now = new Date().toISOString();
    setState((prev) => {
      const next: PunchState = {
        ...prev,
        isPunchedIn: true,
        punchInTime: now,
        elapsedSeconds: 0,
        sessionCount: prev.sessionCount + 1,
        lastResetDate: todayStr(),
      };
      saveState(userId, next);
      return next;
    });
    return now;
  }, [userId]);

  const punchOut = useCallback(() => {
    const punchInTime = state.punchInTime;
    setState((prev) => {
      const sessionSeconds = prev.punchInTime
        ? Math.floor((Date.now() - new Date(prev.punchInTime).getTime()) / 1000)
        : 0;
      const next: PunchState = {
        ...prev,
        isPunchedIn: false,
        punchInTime: null,
        elapsedSeconds: 0,
        cumulativeSeconds: prev.cumulativeSeconds + sessionSeconds,
      };
      saveState(userId, next);
      return next;
    });
    return punchInTime;
  }, [state.punchInTime, userId]);

  // Initialize from server sessions (call on page mount)
  const initFromServer = useCallback((
    sessions: { punch_in_at: string | null; punch_out_at: string | null }[],
    openSession?: { punch_in_at: string } | null,
  ) => {
    let cumulative = 0;
    let count = 0;
    for (const s of sessions) {
      if (s.punch_in_at) {
        count++;
        if (s.punch_out_at) {
          const dur = new Date(s.punch_out_at).getTime() - new Date(s.punch_in_at).getTime();
          cumulative += Math.floor(dur / 1000);
        }
      }
    }
    setState((prev) => {
      const next: PunchState = {
        ...prev,
        cumulativeSeconds: cumulative,
        sessionCount: count,
        lastResetDate: todayStr(),
        isPunchedIn: !!openSession,
        punchInTime: openSession?.punch_in_at ?? null,
        elapsedSeconds: openSession
          ? Math.floor((Date.now() - new Date(openSession.punch_in_at).getTime()) / 1000)
          : 0,
      };
      saveState(userId, next);
      return next;
    });
    setIsReady(true);
  }, [userId]);

  // Offline fallback: load from localStorage (last known state on this device)
  const initFromCache = useCallback(() => {
    if (userId) {
      setState(loadState(userId));
    }
    setIsReady(true);
  }, [userId]);

  const clearAutoClose = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, autoClosedYesterday: false };
      saveState(userId, next);
      return next;
    });
  }, [userId]);

  const totalElapsedSeconds = state.cumulativeSeconds + state.elapsedSeconds;

  return {
    isPunchedIn: state.isPunchedIn,
    punchInTime: state.punchInTime,
    elapsedSeconds: state.elapsedSeconds,
    totalElapsedSeconds,
    sessionCount: state.sessionCount,
    autoClosedYesterday: state.autoClosedYesterday,
    isReady,
    punchIn,
    punchOut,
    initFromServer,
    initFromCache,
    clearAutoClose,
  };
}
