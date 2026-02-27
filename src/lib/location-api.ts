import { supabase } from "./supabase";
import { todayISTTimestamp, endOfDayIST } from "./utils";
import type { HrLocationLog } from "./database.types";

export async function insertLocationLog(data: {
  user_id: string;
  attendance_id?: string | null;
  lat: number;
  long: number;
  source: "punch_in" | "punch_out" | "scheduled" | "manual";
}): Promise<HrLocationLog | null> {
  const { data: record, error } = await supabase
    .from("hr_location_logs")
    .insert({
      user_id: data.user_id,
      attendance_id: data.attendance_id ?? null,
      lat: data.lat,
      long: data.long,
      source: data.source,
      captured_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Insert location log error:", error);
    return null;
  }
  return record;
}

export async function getTodayLocationLogs(userId: string): Promise<HrLocationLog[]> {
  const today = todayISTTimestamp();
  const { data, error } = await supabase
    .from("hr_location_logs")
    .select()
    .eq("user_id", userId)
    .gte("captured_at", today)
    .order("captured_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error("Get today location logs error:", error);
    return [];
  }
  return data || [];
}

export async function getLatestLocationsForUsers(
  userIds: string[]
): Promise<Map<string, HrLocationLog>> {
  const result = new Map<string, HrLocationLog>();
  if (userIds.length === 0) return result;

  // Get the latest location for each user from today
  const today = todayISTTimestamp();
  const { data, error } = await supabase
    .from("hr_location_logs")
    .select()
    .in("user_id", userIds)
    .gte("captured_at", today)
    .order("captured_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("Get latest locations error:", error);
    return result;
  }

  // Keep only the most recent per user
  for (const log of data || []) {
    if (!result.has(log.user_id)) {
      result.set(log.user_id, log);
    }
  }
  return result;
}

export async function getLocationLogsByDate(
  userId: string,
  date: string // YYYY-MM-DD
): Promise<HrLocationLog[]> {
  const startIST = `${date}T00:00:00+05:30`;
  const endIST = endOfDayIST(date);

  const { data, error } = await supabase
    .from("hr_location_logs")
    .select()
    .eq("user_id", userId)
    .gte("captured_at", startIST)
    .lte("captured_at", endIST)
    .order("captured_at", { ascending: true })
    .limit(200);

  if (error) {
    console.error("Get location logs by date error:", error);
    return [];
  }
  return data || [];
}

// Haversine formula — straight-line distance between two GPS points
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/** Sum haversine distances along an array of [lat,lng] points */
function sumPathDistanceKm(points: [number, number][]): number {
  let totalKm = 0;
  for (let i = 1; i < points.length; i++) {
    totalKm += haversineKm(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
  }
  return totalKm;
}

/** Snap GPS points to nearest roads via server-side proxy (protects API key) */
export async function snapToRoads(
  positions: [number, number][]
): Promise<[number, number][]> {
  if (positions.length < 2) return positions;

  try {
    const res = await fetch("/api/snap-to-roads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positions }),
    });

    if (!res.ok) return positions;

    const data = await res.json();
    return data.snapped && data.snapped.length > 0 ? data.snapped : positions;
  } catch {
    return positions;
  }
}

/**
 * Compute actual road distance from location logs.
 * Snaps GPS points to roads (interpolated), then sums distance along the road path.
 * Falls back to raw haversine if snap fails.
 */
export async function computeRoadDistanceKm(logs: HrLocationLog[]): Promise<number> {
  if (logs.length < 2) return 0;

  const rawPositions: [number, number][] = logs.map((l) => [l.lat, l.long]);
  const snapped = await snapToRoads(rawPositions);
  const totalKm = sumPathDistanceKm(snapped);
  return Math.round(totalKm * 10) / 10;
}

/** Haversine-only distance (no road snapping). Used for server-side bulk calculations. */
export function computeTotalDistanceKm(logs: { lat: number; long: number }[]): number {
  if (logs.length < 2) return 0;

  let totalKm = 0;
  for (let i = 1; i < logs.length; i++) {
    totalKm += haversineKm(
      logs[i - 1].lat, logs[i - 1].long,
      logs[i].lat, logs[i].long
    );
  }
  return Math.round(totalKm * 10) / 10;
}
