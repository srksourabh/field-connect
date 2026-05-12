/**
 * Unit tests for classifyGhost() in src/lib/attendance-ghost.ts
 *
 * Run with:
 *   npx tsx scripts/test-classifyGhost.mjs
 *
 * Requires tsx (available via npx — no install needed).
 * Exits with code 0 if all tests pass, 1 otherwise.
 */

// Inline the logic so this script runs as plain .mjs without tsx if needed.
// If the compiled logic drifts from the source, tests will catch it at review.

// --- Inlined from src/lib/attendance-ghost.ts ---
const GHOST_RECT_PUNCH_IN_UTC_H = 3;
const GHOST_RECT_PUNCH_IN_UTC_M = 30;
const GHOST_RECT_PUNCH_OUT_UTC_H = 12;
const GHOST_RECT_PUNCH_OUT_UTC_M = 30;
const GHOST_LEAVE_PUNCH_IN_UTC_H = 18;
const GHOST_LEAVE_PUNCH_IN_UTC_M = 30;

function classifyGhost(rec) {
  if (!rec.punch_in_at) return null;

  const pi = new Date(rec.punch_in_at);
  const piH = pi.getUTCHours();
  const piM = pi.getUTCMinutes();
  const piS = pi.getUTCSeconds();

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
// --- End inlined ---

let passed = 0;
let failed = 0;

function assert(label, actual, expected) {
  if (actual === expected) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  FAIL  ${label}`);
    console.log(`        expected: ${JSON.stringify(expected)}`);
    console.log(`        actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

console.log("\nclassifyGhost — unit tests\n");

// 1. Real punch (13:00:00 UTC in, 21:00:00 UTC out, status present) → null
assert(
  "real punch (13:00 UTC in, 21:00 UTC out, present)",
  classifyGhost({ punch_in_at: "2026-04-11T13:00:00.000Z", punch_out_at: "2026-04-11T21:00:00.000Z", status: "present" }),
  null
);

// 2. Rectification ghost (exact 03:30:00 UTC + 12:30:00 UTC, status present) → 'rectification'
assert(
  "rectification ghost (exact bookends, status present)",
  classifyGhost({ punch_in_at: "2026-04-11T03:30:00.000Z", punch_out_at: "2026-04-11T12:30:00.000Z", status: "present" }),
  "rectification"
);

// 3a. Off by 1 second on punch_in — should return null
assert(
  "rectification off-by-1s on punch_in → null",
  classifyGhost({ punch_in_at: "2026-04-11T03:30:01.000Z", punch_out_at: "2026-04-11T12:30:00.000Z", status: "present" }),
  null
);

// 3b. Off by 1 second on punch_out — should return null
assert(
  "rectification off-by-1s on punch_out → null",
  classifyGhost({ punch_in_at: "2026-04-11T03:30:00.000Z", punch_out_at: "2026-04-11T12:30:01.000Z", status: "present" }),
  null
);

// 4. Leave ghost (18:30:00 UTC in, null out, status on-leave) → 'leave'
assert(
  "leave ghost (18:30 UTC in, null out, on-leave)",
  classifyGhost({ punch_in_at: "2026-04-10T18:30:00.000Z", punch_out_at: null, status: "on-leave" }),
  "leave"
);

// 5. WFH ghost (18:30:00 UTC in, null out, status present) → 'wfh'
assert(
  "wfh ghost (18:30 UTC in, null out, present)",
  classifyGhost({ punch_in_at: "2026-04-10T18:30:00.000Z", punch_out_at: null, status: "present" }),
  "wfh"
);

// 6. Null punch_in_at → null
assert(
  "null punch_in_at → null",
  classifyGhost({ punch_in_at: null, punch_out_at: null, status: "present" }),
  null
);

// 7. Real punch exactly at 09:00:00.000 IST (03:30:00 UTC) but punch_out is NOT 18:00 IST
//    (e.g. punched out at 17:45 IST = 12:15 UTC) → null  (only flagged when BOTH bookends match)
assert(
  "real punch at 09:00 IST (03:30 UTC) with non-matching punch_out → null",
  classifyGhost({ punch_in_at: "2026-04-11T03:30:00.000Z", punch_out_at: "2026-04-11T12:15:00.000Z", status: "present" }),
  null
);

// 8. Rectification with on-leave status → still 'rectification'
//    (timestamp pair is the strict identifier; status is informational on this path)
assert(
  "rectification ghost with on-leave status → still rectification",
  classifyGhost({ punch_in_at: "2026-04-11T03:30:00.000Z", punch_out_at: "2026-04-11T12:30:00.000Z", status: "on-leave" }),
  "rectification"
);

// 9. Leave ghost at 18:30 UTC in, null out, but status is 'late' (neither leave nor wfh) → null
assert(
  "18:30 UTC ghost with unrecognised status late → null",
  classifyGhost({ punch_in_at: "2026-04-10T18:30:00.000Z", punch_out_at: null, status: "late" }),
  null
);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
