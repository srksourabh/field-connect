import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Vercel Cron Job — runs at 00:00 IST (18:30 UTC) daily.
 * Closes all open attendance sessions from previous days and sets status
 * based on hours worked: >=8h present, 4-8h half-day, <4h absent.
 */
export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron (authorization header)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all open sessions (no punch_out_at)
  const { data: openSessions, error: fetchError } = await supabaseAdmin
    .from("hr_attendance")
    .select("id, user_id, punch_in_at, created_at")
    .is("punch_out_at", null)
    .not("status", "in", '("on-leave","holiday")')
    .limit(1000);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!openSessions || openSessions.length === 0) {
    return NextResponse.json({ message: "No open sessions to close", closed: 0 });
  }

  let closedCount = 0;

  for (const session of openSessions) {
    if (!session.punch_in_at) continue;

    // Compute punch-in date in IST
    const punchInDate = new Date(session.punch_in_at)
      .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    // Only close sessions from previous days (not today's)
    const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    if (punchInDate === todayIST) continue;

    // Auto-close at 23:59 IST of the punch-in date
    const autoCloseTimestamp = `${punchInDate}T23:59:00+05:30`;

    // Compute hours to determine status
    const durMs = new Date(autoCloseTimestamp).getTime() - new Date(session.punch_in_at).getTime();
    const durHours = durMs / 3600000;
    const status = durHours >= 8 ? "present" : durHours >= 4 ? "half-day" : "absent";

    const { error: updateError } = await supabaseAdmin
      .from("hr_attendance")
      .update({ punch_out_at: autoCloseTimestamp, status })
      .eq("id", session.id)
      .is("punch_out_at", null);

    if (!updateError) closedCount++;
  }

  return NextResponse.json({
    message: `Auto punch-out complete`,
    closed: closedCount,
    total: openSessions.length,
  });
}
