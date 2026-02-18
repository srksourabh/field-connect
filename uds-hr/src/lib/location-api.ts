import { supabase } from "./supabase";
import { todayISTTimestamp } from "./utils";
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
    .order("captured_at", { ascending: true });

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
    .order("captured_at", { ascending: false });

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
  const endIST = `${date}T23:59:59+05:30`;

  const { data, error } = await supabase
    .from("hr_location_logs")
    .select()
    .eq("user_id", userId)
    .gte("captured_at", startIST)
    .lte("captured_at", endIST)
    .order("captured_at", { ascending: true });

  if (error) {
    console.error("Get location logs by date error:", error);
    return [];
  }
  return data || [];
}

// Haversine formula to compute distance between consecutive GPS points
export function computeTotalDistanceKm(logs: HrLocationLog[]): number {
  if (logs.length < 2) return 0;

  let totalKm = 0;
  for (let i = 1; i < logs.length; i++) {
    totalKm += haversineKm(
      logs[i - 1].lat,
      logs[i - 1].long,
      logs[i].lat,
      logs[i].long
    );
  }
  return Math.round(totalKm * 10) / 10; // 1 decimal place
}

function haversineKm(
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
