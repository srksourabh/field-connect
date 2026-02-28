import { supabase } from "./supabase";
import { todayISTTimestamp, autoCloseIST, logError } from "./utils";
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
    .maybeSingle();

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
    logError("Punch in error:", error);
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
    logError("Punch out error:", error);
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
    .maybeSingle();

  if (error) return null;
  return data;
}

/** Returns today's sessions, or null if server is unreachable (offline/error). */
export async function getTodayAllSessions(userId: string): Promise<HrAttendance[] | null> {
  const today = todayISTTimestamp();
  const { data, error } = await supabase
    .from("hr_attendance")
    .select()
    .eq("user_id", userId)
    .gte("created_at", today)
    .order("created_at", { ascending: true });

  if (error) {
    logError("Get today sessions error:", error);
    return null; // null = couldn't reach server; [] = no sessions found
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

/** After punch-out, update attendance status based on cumulative hours:
 *  >=4h → present, 1-4h → half-day, <1h → absent */
export async function updateAttendanceStatus(userId: string): Promise<void> {
  const sessions = await getTodayAllSessions(userId);
  if (!sessions) return; // Server unreachable — skip
  const totalSecs = computeCumulativeSeconds(sessions);
  const totalHours = totalSecs / 3600;
  const status = totalHours >= 4 ? "present" : totalHours >= 1 ? "half-day" : "absent";

  // Update today's work sessions to the computed status (skip on-leave/holiday records)
  const today = todayISTTimestamp();
  await supabase
    .from("hr_attendance")
    .update({ status })
    .eq("user_id", userId)
    .gte("created_at", today)
    .not("status", "in", '("on-leave","holiday")');
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
    logError("Attendance fetch error:", error);
    return [];
  }
  return data || [];
}

/** Close an open session from a previous IST day at 23:59 of its punch-in date */
export async function closeStaleSession(
  session: HrAttendance
): Promise<HrAttendance | null> {
  if (!session.punch_in_at || session.punch_out_at) return null;

  const punchInDate = new Date(session.punch_in_at)
    .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const autoCloseTimestamp = autoCloseIST(punchInDate);

  // Compute actual hours to set correct status: >=4h present, 1-4h half-day, <1h absent
  const durMs = new Date(autoCloseTimestamp).getTime() - new Date(session.punch_in_at).getTime();
  const durHours = durMs / 3600000;
  const status = durHours >= 4 ? "present" : durHours >= 1 ? "half-day" : "absent";

  const { data, error } = await supabase
    .from("hr_attendance")
    .update({ punch_out_at: autoCloseTimestamp, status })
    .eq("id", session.id)
    .is("punch_out_at", null)
    .select()
    .single();

  if (error) {
    logError("Auto close stale session error:", error);
    return null;
  }
  return data;
}
