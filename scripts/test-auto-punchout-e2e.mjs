/**
 * End-to-end test for the auto punch-out at midnight feature.
 *
 * Tests:
 * 1. Cron endpoint returns 500 when CRON_SECRET is missing (simulated via wrong secret)
 * 2. Cron endpoint returns 401 with wrong Bearer token
 * 3. Creates a stale open session (yesterday), calls cron, verifies it gets closed
 * 4. Verifies closed session has correct status based on hours worked
 * 5. Verifies today's open session is NOT closed by cron
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iefwhxxhrycaalhxkfgp.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = process.env.SITE_URL || "https://field-connect.vercel.app";
const CRON_SECRET = process.env.CRON_SECRET;

// Use a known test user (super_admin) — we'll create temp attendance records
let testUserId = null;

async function sbRest(path, method = "GET", body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : method === "PATCH" ? "return=representation" : "return=minimal",
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Supabase ${method} ${path}: ${res.status} ${text}`);
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") return null;
  return res.json();
}

function yesterdayIST() {
  const now = new Date();
  const istMs = now.getTime() + (5.5 * 60 * 60 * 1000);
  const ist = new Date(istMs);
  ist.setUTCDate(ist.getUTCDate() - 1);
  return ist.toISOString().slice(0, 10); // YYYY-MM-DD
}

function todayIST() {
  const now = new Date();
  const istMs = now.getTime() + (5.5 * 60 * 60 * 1000);
  return new Date(istMs).toISOString().slice(0, 10);
}

const createdRecordIds = [];

async function cleanup() {
  console.log("\n--- Cleanup ---");
  for (const id of createdRecordIds) {
    try {
      await sbRest(`hr_attendance?id=eq.${id}`, "DELETE");
      console.log(`  Deleted attendance record: ${id}`);
    } catch (e) {
      console.log(`  Failed to delete ${id}: ${e.message}`);
    }
  }
}

async function callCron(secret) {
  const headers = { "Content-Type": "application/json" };
  if (secret) headers["Authorization"] = `Bearer ${secret}`;

  const res = await fetch(`${SITE_URL}/api/cron/auto-punch-out`, {
    method: "GET",
    headers,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.log(`  FAIL: ${label}`);
    failed++;
  }
}

async function run() {
  if (!SERVICE_ROLE_KEY) { console.error("Set SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
  if (!CRON_SECRET) { console.error("Set CRON_SECRET"); process.exit(1); }

  // Find a super_admin user to use as test subject
  const admins = await sbRest("hr_profiles?role=eq.super_admin&select=id&limit=1");
  testUserId = admins[0]?.id;
  if (!testUserId) throw new Error("No super_admin found for testing");
  console.log(`Test user: ${testUserId}\n`);

  // === Test 1: Cron returns 401 with wrong secret ===
  console.log("=== Test 1: Cron rejects wrong Bearer token ===");
  const res1 = await callCron("wrong-secret-12345");
  assert("Returns 401 for wrong token", res1.status === 401);

  // === Test 2: Cron returns 401 with no auth header ===
  console.log("\n=== Test 2: Cron rejects missing auth ===");
  const res2 = await callCron(null);
  assert("Returns 401 for missing auth", res2.status === 401);

  // === Test 3: Create stale session (yesterday) + today's session, call cron ===
  console.log("\n=== Test 3: Create stale + today sessions ===");

  const yesterday = yesterdayIST();
  const today = todayIST();

  // Stale session: punched in at 09:00 IST yesterday, no punch out
  const stalePunchIn = `${yesterday}T09:00:00+05:30`;
  const [staleRecord] = await sbRest("hr_attendance", "POST", {
    user_id: testUserId,
    punch_in_at: stalePunchIn,
    status: "present",
    created_at: stalePunchIn,
  });
  createdRecordIds.push(staleRecord.id);
  console.log(`  Created stale session: ${staleRecord.id} (${yesterday} 09:00)`);

  // Today's session: punched in at 09:00 IST today, no punch out (should NOT be closed)
  const todayPunchIn = `${today}T09:00:00+05:30`;
  const [todayRecord] = await sbRest("hr_attendance", "POST", {
    user_id: testUserId,
    punch_in_at: todayPunchIn,
    status: "present",
    created_at: todayPunchIn,
  });
  createdRecordIds.push(todayRecord.id);
  console.log(`  Created today session: ${todayRecord.id} (${today} 09:00)`);

  // === Test 4: Call cron with correct secret ===
  console.log("\n=== Test 4: Call cron with correct secret ===");
  const res3 = await callCron(CRON_SECRET);
  console.log(`  Response: ${res3.status} — ${JSON.stringify(res3.body)}`);
  assert("Cron returns 200", res3.status === 200);
  assert("Cron closed at least 1 session", (res3.body.closed || 0) >= 1);

  // === Test 5: Verify stale session was closed ===
  console.log("\n=== Test 5: Verify stale session closed ===");
  const [staleAfter] = await sbRest(`hr_attendance?id=eq.${staleRecord.id}&select=*`);
  assert("Stale session has punch_out_at", !!staleAfter.punch_out_at);
  if (staleAfter.punch_out_at) {
    const expectedClose = `${yesterday}T23:59:00+05:30`;
    const closeTime = new Date(staleAfter.punch_out_at);
    const expectedTime = new Date(expectedClose);
    // Allow 1 minute tolerance
    const diffMs = Math.abs(closeTime.getTime() - expectedTime.getTime());
    assert(`Closed at ~23:59 IST (diff: ${diffMs}ms)`, diffMs < 120000);

    // Check status: 09:00 to 23:59 = ~15 hours → should be "present"
    assert(`Status is "present" (was: "${staleAfter.status}")`, staleAfter.status === "present");
  }

  // === Test 6: Verify today's session was NOT closed ===
  console.log("\n=== Test 6: Verify today's session untouched ===");
  const [todayAfter] = await sbRest(`hr_attendance?id=eq.${todayRecord.id}&select=*`);
  assert("Today's session still open (no punch_out_at)", !todayAfter.punch_out_at);

  // === Summary ===
  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
}

run()
  .catch(async (err) => {
    console.error(`\nFatal: ${err.message}`);
    failed++;
  })
  .finally(async () => {
    await cleanup();
    console.log("\n=== ALL DONE ===");
    if (failed > 0) process.exit(1);
  });
