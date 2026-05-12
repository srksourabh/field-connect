// Ghost-row detection for hr_attendance records.
//
// Two server-side paths insert synthetic attendance rows that are NOT real punches:
//   1. Rectification approval (no corrected times supplied): punch_in_at = 09:00:00 IST
//      (03:30:00 UTC), punch_out_at = 18:00:00 IST (12:30:00 UTC).
//   2. Leave / WFH approval: punch_in_at = 00:00:00 IST (18:30:00 UTC prev-day),
//      punch_out_at = NULL.
//
// Both signatures were chosen to be human-unambiguous but can collide with real punches
// on the same IST date, inflating hours and skewing analytics.
//
// classifyGhost() returns the kind of ghost, or null when the row is a real punch.
// It requires an EXACT match of both hour AND minute AND second (and for rectification,
// BOTH bookends must match) to minimise false positives.
//
// IMPORTANT: These constants MUST stay in sync with the creator routes:
//   src/app/api/admin/rectification-action/route.ts
//   src/lib/rectification-api.ts
//   src/app/api/admin/leave-action/route.ts
//   src/lib/leave-api.ts
// If any creator changes its fallback timestamp, update these constants and re-run tests.

const GHOST_RECT_PUNCH_IN_UTC_H = 3;
const GHOST_RECT_PUNCH_IN_UTC_M = 30;
const GHOST_RECT_PUNCH_OUT_UTC_H = 12;
const GHOST_RECT_PUNCH_OUT_UTC_M = 30;
const GHOST_LEAVE_PUNCH_IN_UTC_H = 18;
const GHOST_LEAVE_PUNCH_IN_UTC_M = 30;

export type GhostKind = "rectification" | "leave" | "wfh" | null;

export function classifyGhost(rec: {
  punch_in_at: string | null;
  punch_out_at: string | null;
  status: string;
}): GhostKind {
  if (!rec.punch_in_at) return null;

  const pi = new Date(rec.punch_in_at);
  const piH = pi.getUTCHours();
  const piM = pi.getUTCMinutes();
  const piS = pi.getUTCSeconds();

  // Rectification fallback signature — BOTH bookends must match exactly.
  // Status is not used as identifier here; the timestamp pair is the strict discriminator.
  if (
    piH === GHOST_RECT_PUNCH_IN_UTC_H &&
    piM === GHOST_RECT_PUNCH_IN_UTC_M &&
    piS === 0 &&
    rec.punch_out_at
  ) {
    const po = new Date(rec.punch_out_at);
    if (
      po.getUTCHours() === GHOST_RECT_PUNCH_OUT_UTC_H &&
      po.getUTCMinutes() === GHOST_RECT_PUNCH_OUT_UTC_M &&
      po.getUTCSeconds() === 0
    ) {
      return "rectification";
    }
  }

  // Leave / WFH approval signature — 00:00:00 IST punch_in (18:30:00 UTC prev-day),
  // no punch_out. Status distinguishes leave from WFH.
  if (
    piH === GHOST_LEAVE_PUNCH_IN_UTC_H &&
    piM === GHOST_LEAVE_PUNCH_IN_UTC_M &&
    piS === 0 &&
    !rec.punch_out_at
  ) {
    if (rec.status === "on-leave") return "leave";
    if (rec.status === "present") return "wfh";
    return null;
  }

  return null;
}
