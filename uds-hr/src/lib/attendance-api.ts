import { supabase } from "./supabase";
import { todayISTTimestamp } from "./utils";
import type { HrAttendance } from "./database.types";

export async function createPunchIn(data: {
  user_id: string;
  punch_in_at: string;
  punch_in_lat: number | null;
  punch_in_long: number | null;
}): Promise<HrAttendance | null> {
  // Guard: if there's already an open session today, return it instead of creating a duplicate
  const today = todayISTTimestamp();
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
  const today = todayISTTimestamp();
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
  const today = todayISTTimestamp();
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
  const today = todayISTTimestamp();
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

/** After punch-out, update attendance status based on cumulative hours: >=8h → present, <8h → half-day */
export async function updateAttendanceStatus(userId: string): Promise<void> {
  const sessions = await getTodayAllSessions(userId);
  const totalSecs = computeCumulativeSeconds(sessions);
  const status = totalSecs >= 8 * 3600 ? "present" : "half-day";

  // Update all of today's sessions to the computed status
  const today = todayISTTimestamp();
  await supabase
    .from("hr_attendance")
    .update({ status })
    .eq("user_id", userId)
    .gte("created_at", today);
}

export async function getAttendanceByMonth(
  userId: string,
  year: number,
  month: number
): Promise<HrAttendance[]> {
  // Build IST boundaries: first day 00:00 IST → last day 23:59:59 IST
  const pad = (n: number) => n.toString().padStart(2, "0");
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startDate = `${year}-${pad(month + 1)}-01T00:00:00+05:30`;
  const endDate = `${year}-${pad(month + 1)}-${pad(lastDay)}T23:59:59+05:30`;

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

/** Close an open session from a previous IST day at 23:59 of its punch-in date */
export async function closeStaleSession(
  session: HrAttendance
): Promise<HrAttendance | null> {
  if (!session.punch_in_at || session.punch_out_at) return null;

  // Build 23:59:00 IST on the punch-in date
  const punchInDate = new Date(session.punch_in_at)
    .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const autoCloseTimestamp = `${punchInDate}T23:59:00+05:30`;

  const { data, error } = await supabase
    .from("hr_attendance")
    .update({ punch_out_at: autoCloseTimestamp, status: "half-day" })
    .eq("id", session.id)
    .is("punch_out_at", null)
    .select()
    .single();

  if (error) {
    console.error("Auto close stale session error:", error);
    return null;
  }
  return data;
}
