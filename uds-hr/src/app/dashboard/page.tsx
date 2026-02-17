"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import PunchCard from "@/components/punch/PunchCard";
import LocationWidget from "@/components/punch/LocationWidget";
import SyncStatusBanner from "@/components/punch/SyncStatusBanner";
import TodayActivityGrid from "@/components/punch/TodayActivityGrid";
import NotificationDropdown from "@/components/ui/NotificationDropdown";
import { usePunchState } from "@/hooks/usePunchState";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { useLocationTracker } from "@/hooks/useLocationTracker";
import { MapPin, FileText } from "lucide-react";
import { addToQueue } from "@/lib/sync-queue";
import { createPunchIn, updatePunchOut, getTodayAllSessions, closeStaleSession } from "@/lib/attendance-api";
import { todayIST, toISTDateStr } from "@/lib/utils";
import { insertLocationLog, getTodayLocationLogs, computeTotalDistanceKm } from "@/lib/location-api";
import { getUserLeaveBalance, getPendingLeaveCount } from "@/lib/leave-api";
import type { LeaveInfo } from "@/components/punch/TodayActivityGrid";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function DashboardHome() {
  const { user, profile } = useAuth();
  const userId = user?.id ?? "";
  const {
    isPunchedIn, punchInTime, elapsedSeconds, totalElapsedSeconds,
    sessionCount, punchIn, punchOut, initFromServer,
  } = usePunchState(userId);
  const [currentTime, setCurrentTime] = useState(new Date());
  const geo = useGeolocation();
  const isOnline = useOnlineStatus();
  const { pendingCount } = useSyncQueue();
  const [distanceKm, setDistanceKm] = useState(0);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const [firstPunchIn, setFirstPunchIn] = useState<string | null>(null);
  const [lastPunchOut, setLastPunchOut] = useState<string | null>(null);
  const [leaveInfo, setLeaveInfo] = useState<LeaveInfo | null>(null);
  const [lastPunchLocation, setLastPunchLocation] = useState<string | null>(null);
  const [hrPolicyUrl, setHrPolicyUrl] = useState<string | null>(null);
  const lastInitUserId = useRef("");
  const punchingRef = useRef(false); // debounce guard

  // Location tracker — captures GPS at scheduled times while punched in
  useLocationTracker(isPunchedIn, userId, attendanceId, isOnline);

  // Live clock — updates every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch HR policy URL
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("hr_config")
        .select("value")
        .eq("key", "hr_policy_url")
        .single();
      if (data?.value) setHrPolicyUrl(data.value);
    })();
  }, []);

  // Restore last punch location from localStorage
  useEffect(() => {
    if (!userId) return;
    try {
      const stored = localStorage.getItem(`uds_last_punch_location_${userId}`);
      if (stored) setLastPunchLocation(stored);
    } catch { /* ignore */ }
  }, [userId]);

  // Sync with server on mount and when user changes
  useEffect(() => {
    if (!userId || lastInitUserId.current === userId) return;
    lastInitUserId.current = userId;

    // Reset dashboard state for new user
    setDistanceKm(0);
    setAttendanceId(null);
    setFirstPunchIn(null);
    setLastPunchOut(null);
    setLeaveInfo(null);
    setLastPunchLocation(null);

    (async () => {
      let sessions = await getTodayAllSessions(userId);
      let openSession = sessions.find((s) => !s.punch_out_at) ?? null;

      // Auto-close stale sessions from a previous IST day
      if (openSession?.punch_in_at) {
        const sessionDate = toISTDateStr(new Date(openSession.punch_in_at));
        if (sessionDate !== todayIST()) {
          await closeStaleSession(openSession);
          // Re-fetch today's sessions (the stale one is now closed and from a past day)
          sessions = await getTodayAllSessions(userId);
          openSession = sessions.find((s) => !s.punch_out_at) ?? null;
        }
      }

      initFromServer(sessions, openSession ? { punch_in_at: openSession.punch_in_at! } : null);
      if (sessions.length > 0) {
        setFirstPunchIn(sessions[0].punch_in_at);
        const lastSession = sessions[sessions.length - 1];
        if (lastSession.punch_out_at) {
          setLastPunchOut(lastSession.punch_out_at);
        }
        if (openSession) {
          setAttendanceId(openSession.id);
        }
      }

      // Get distance from location logs
      const logs = await getTodayLocationLogs(userId);
      setDistanceKm(computeTotalDistanceKm(logs));

      // Fetch leave balance + pending count
      const [balance, pending] = await Promise.all([
        getUserLeaveBalance(userId),
        getPendingLeaveCount(userId),
      ]);
      if (balance) {
        setLeaveInfo({
          sickRemaining: balance.sick_total - balance.sick_used,
          casualRemaining: balance.casual_total - balance.casual_used,
          privilegeRemaining: balance.privilege_total - balance.privilege_used,
          pending,
        });
      }
    })();
  }, [userId, initFromServer]);

  const handleToggle = useCallback(async () => {
    if (!userId) return;
    // Prevent rapid double-triggers
    if (punchingRef.current) return;
    punchingRef.current = true;
    setTimeout(() => { punchingRef.current = false; }, 3000);

    if (!isPunchedIn) {
      // Punch In — save location
      if (geo.address) {
        setLastPunchLocation(geo.address);
        try { localStorage.setItem(`uds_last_punch_location_${userId}`, geo.address); } catch { /* ignore */ }
      }
      const timestamp = punchIn();
      const payload = {
        user_id: userId,
        punch_in_at: timestamp,
        punch_in_lat: geo.lat,
        punch_in_long: geo.long,
      };

      if (isOnline) {
        const record = await createPunchIn(payload);
        if (record) {
          setAttendanceId(record.id);
          if (!firstPunchIn) setFirstPunchIn(timestamp);
        }
        // Log punch-in location
        if (geo.lat != null && geo.long != null) {
          await insertLocationLog({
            user_id: userId,
            attendance_id: record?.id ?? null,
            lat: geo.lat,
            long: geo.long,
            source: "punch_in",
          });
        }
      } else {
        addToQueue({
          id: crypto.randomUUID(),
          type: "punch_in",
          payload,
          timestamp,
        });
        if (!firstPunchIn) setFirstPunchIn(timestamp);
        // Queue location log offline
        if (geo.lat != null && geo.long != null) {
          addToQueue({
            id: crypto.randomUUID(),
            type: "location_log",
            payload: {
              user_id: userId,
              lat: geo.lat,
              long: geo.long,
              source: "punch_in",
            },
            timestamp,
          });
        }
      }
    } else {
      // Punch Out
      const punchInTs = punchOut();
      const now = new Date().toISOString();
      const payload = {
        user_id: userId,
        punch_out_at: now,
        punch_out_lat: geo.lat,
        punch_out_long: geo.long,
      };

      if (isOnline) {
        await updatePunchOut(payload);
        setLastPunchOut(now);
        // Log punch-out location
        if (geo.lat != null && geo.long != null) {
          await insertLocationLog({
            user_id: userId,
            attendance_id: attendanceId ?? null,
            lat: geo.lat,
            long: geo.long,
            source: "punch_out",
          });
          // Recompute distance
          const logs = await getTodayLocationLogs(userId);
          setDistanceKm(computeTotalDistanceKm(logs));
        }
      } else {
        addToQueue({
          id: crypto.randomUUID(),
          type: "punch_out",
          payload: { ...payload, punch_in_at: punchInTs },
          timestamp: now,
        });
        setLastPunchOut(now);
        if (geo.lat != null && geo.long != null) {
          addToQueue({
            id: crypto.randomUUID(),
            type: "location_log",
            payload: {
              user_id: userId,
              attendance_id: attendanceId ?? null,
              lat: geo.lat,
              long: geo.long,
              source: "punch_out",
            },
            timestamp: now,
          });
        }
      }
      setAttendanceId(null);
    }
  }, [userId, isPunchedIn, punchIn, punchOut, geo.lat, geo.long, geo.address, isOnline, attendanceId, firstPunchIn]);

  const greeting = getGreeting();

  const displayName = profile?.full_name ?? "User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const avatarUrl = profile?.avatar_url;

  return (
    <div className="px-5 pt-12 pb-4 space-y-0">
      {/* Header */}
      <header className="flex justify-between items-center py-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {initials}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background-light dark:border-background-dark rounded-full" />
          </div>
          <div>
            <h1 className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {greeting},
            </h1>
            <p className="text-lg font-bold leading-none">{displayName}</p>
          </div>
        </div>
        <NotificationDropdown />
      </header>

      {/* Live Clock — IST */}
      <p className="text-sm text-slate-600 dark:text-slate-300 -mt-1 mb-2">
        {currentTime.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}
        {" \u2022 "}
        <span className="font-bold">
          {currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase()}
        </span>
        {" "}
        <span className="text-xs font-medium text-slate-400">IST</span>
      </p>

      {/* Sync Status */}
      <SyncStatusBanner isOnline={isOnline} pendingCount={pendingCount} />

      {/* Punch Card */}
      <PunchCard
        isPunchedIn={isPunchedIn}
        elapsedSeconds={elapsedSeconds}
        onToggle={handleToggle}
        syncing={geo.loading}
      />

      {/* Location */}
      <LocationWidget
        address={geo.address}
        loading={geo.loading}
        onRefresh={geo.refresh}
      />

      {/* Last Punch Location Pill */}
      {lastPunchLocation && (
        <div className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs rounded-full px-3 py-1 w-fit">
          <MapPin className="w-3 h-3" />
          <span className="truncate max-w-[250px]">Punched in from {lastPunchLocation}</span>
        </div>
      )}

      {/* Activity Grid */}
      <TodayActivityGrid
        punchInTime={firstPunchIn ?? punchInTime}
        elapsedSeconds={totalElapsedSeconds}
        punchOutTime={lastPunchOut}
        distanceKm={distanceKm}
        leaveInfo={leaveInfo}
        sessionCount={sessionCount}
      />

      {/* HR Policy */}
      {hrPolicyUrl && (
        <a
          href={hrPolicyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-200 dark:border-gray-700/50 mt-4 hover:border-primary/40 transition-colors"
        >
          <div className="bg-primary/10 p-2.5 rounded-lg">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800 dark:text-white">UDS General HR Policy</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Tap to view company HR policy document</p>
          </div>
        </a>
      )}
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}
