import { supabase } from "./supabase";
import type { HrAttendance } from "./database.types";

export async function createPunchIn(data: {
  user_id: string;
  punch_in_at: string;
  punch_in_lat: number | null;
  punch_in_long: number | null;
}): Promise<HrAttendance | null> {
  // Guard: if there's already an open session today, return it instead of creating a duplicate
  const today = new Date().toISOString().split("T")[0];
  const { data: existing } = await supabase
    .from("hr_attendance")
    .select()
    .eq("user_id", data.user_id)
    .gte("created_at", today)
    .is("punch_out_at", null)
    .limit(1)
    .single();

  if (existing) {
    console.warn("Open session already exists, skipping duplicate punch-in");
    return existing;
  }

  const { data: record, error } = await supabase
    .from("hr_attendance")
    .insert({
      user_id: data.user_id,
      punch_in_at: data.punch_in_at,
      punch_in_lat: data.punch_in_lat,
      punch_in_long: data.punch_in_long,
      status: "present",
      synced: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Punch in error:", error);
    return null;
  }
  return record;
}

export async function updatePunchOut(data: {
  user_id: string;
  punch_out_at: string;
  punch_out_lat: number | null;
  punch_out_long: number | null;
}): Promise<HrAttendance | null> {
  // Find today's open record
  const today = new Date().toISOString().split("T")[0];
  const { data: record, error } = await supabase
    .from("hr_attendance")
    .update({
      punch_out_at: data.punch_out_at,
      punch_out_lat: data.punch_out_lat,
      punch_out_long: data.punch_out_long,
    })
    .eq("user_id", data.user_id)
    .gte("created_at", today)
    .is("punch_out_at", null)
    .select()
    .single();

  if (error) {
    console.error("Punch out error:", error);
    return null;
  }
  return record;
}

export async function getTodayAttendance(userId: string): Promise<HrAttendance | null> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("hr_attendance")
    .select()
    .eq("user_id", userId)
    .gte("created_at", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}

export async function getTodayAllSessions(userId: string): Promise<HrAttendance[]> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("hr_attendance")
    .select()
    .eq("user_id", userId)
    .gte("created_at", today)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Get today sessions error:", error);
    return [];
  }
  return data || [];
}

export function computeCumulativeSeconds(sessions: HrAttendance[]): number {
  let total = 0;
  for (const s of sessions) {
    if (s.punch_in_at && s.punch_out_at) {
      const dur = new Date(s.punch_out_at).getTime() - new Date(s.punch_in_at).getTime();
      total += Math.floor(dur / 1000);
    }
  }
  return total;
}

export async function getAttendanceByMonth(
  userId: string,
  year: number,
  month: number
): Promise<HrAttendance[]> {
  const startDate = new Date(year, month, 1).toISOString();
  const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  const { data, error } = await supabase
    .from("hr_attendance")
    .select()
    .eq("user_id", userId)
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Attendance fetch error:", error);
    return [];
  }
  return data || [];
}
