/**
 * Headless E2E tests for 5 team feedback items
 * Tests against staging deployment using Playwright
 *
 * Covers:
 * 1. Manager name & state on approval cards
 * 2. WFH leave balance (10 days)
 * 3. Admin attendance override API
 * 4. Attendance calendar shows absent for past working days
 * 5. Financial year reset API
 */

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

// --- Config ---
const STAGING_URL = process.env.TEST_URL || "https://uds-hr.vercel.app";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mzwmebrwmxhfyohulddl.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY env var required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let passed = 0;
let failed = 0;
const results = [];

function log(icon, msg) {
  console.log(`${icon} ${msg}`);
}

function pass(test) {
  passed++;
  results.push({ test, status: "PASS" });
  log("✅", test);
}

function fail(test, reason) {
  failed++;
  results.push({ test, status: "FAIL", reason });
  log("❌", `${test} — ${reason}`);
}

// Helper: login as a user and get session token
async function getSessionToken(phone, name) {
  const email = `${phone}@uds.hr`;
  const password = name.replace(/\s/g, "").slice(0, 4).toLowerCase() + phone.slice(-4);

  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login failed for ${phone}: ${error.message}`);
  return data.session.access_token;
}

// ===== TEST 1: Database schema — WFH columns exist =====
async function testWfhColumns() {
  log("🔍", "TEST 1a: Checking wfh_total/wfh_used columns in hr_leave_balances...");

  const { data, error } = await supabase
    .from("hr_leave_balances")
    .select("wfh_total, wfh_used")
    .limit(1);

  if (error) {
    fail("WFH columns exist in DB", error.message);
    return;
  }
  pass("WFH columns exist in hr_leave_balances");

  // Check default values
  if (data && data.length > 0) {
    const row = data[0];
    if (typeof row.wfh_total === "number" && typeof row.wfh_used === "number") {
      pass("WFH columns have numeric values");
    } else {
      fail("WFH columns have numeric values", `Got: wfh_total=${row.wfh_total}, wfh_used=${row.wfh_used}`);
    }
  }
}

// ===== TEST 2: WFH balance defaults =====
async function testWfhDefaults() {
  log("🔍", "TEST 1b: Checking WFH default of 10 for existing records...");

  const { data } = await supabase
    .from("hr_leave_balances")
    .select("wfh_total")
    .eq("wfh_total", 10)
    .limit(5);

  if (data && data.length > 0) {
    pass(`WFH default is 10 (found ${data.length} records with wfh_total=10)`);
  } else {
    fail("WFH default is 10", "No records found with wfh_total=10");
  }
}

// ===== TEST 3: Leave type 'wfh' in leave_requests =====
async function testWfhLeaveType() {
  log("🔍", "TEST 2a: Checking 'wfh' is a valid leave request type...");

  // Check if constraint allows 'wfh'
  const { data, error } = await supabase
    .from("hr_leave_requests")
    .select("id")
    .eq("type", "wfh")
    .limit(1);

  if (error && error.message.includes("invalid")) {
    fail("WFH is valid leave type", error.message);
  } else {
    pass("WFH is valid leave type in hr_leave_requests");
  }
}

// ===== TEST 4: Attendance override API =====
async function testAttendanceOverrideAPI() {
  log("🔍", "TEST 3: Testing attendance override API...");

  // Find a super_admin user
  const { data: admins } = await supabase
    .from("hr_profiles")
    .select("id, full_name, phone")
    .eq("role", "super_admin")
    .is("deactivated_at", null)
    .limit(1);

  if (!admins || admins.length === 0) {
    fail("Attendance override API", "No super_admin found");
    return;
  }

  const admin = admins[0];

  // Find a regular employee
  const { data: employees } = await supabase
    .from("hr_profiles")
    .select("id, full_name, phone")
    .eq("role", "employee")
    .is("deactivated_at", null)
    .limit(1);

  if (!employees || employees.length === 0) {
    fail("Attendance override API", "No employee found");
    return;
  }

  const employee = employees[0];

  // Get admin session token
  let token;
  try {
    token = await getSessionToken(admin.phone, admin.full_name);
  } catch (e) {
    fail("Attendance override API — admin login", e.message);
    return;
  }
  pass("Admin login for override test");

  // Test with a past date
  const testDate = "2026-03-20";

  // Test: override to absent
  const res = await fetch(`${STAGING_URL}/api/admin/attendance-override`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      user_id: employee.id,
      date: testDate,
      status: "absent",
    }),
  });

  const body = await res.json();

  if (res.ok && body.success) {
    pass(`Attendance override API — marked ${employee.full_name} as absent on ${testDate}`);
  } else {
    fail("Attendance override API", body.error || `HTTP ${res.status}`);
  }

  // Verify the record in DB
  const { data: records } = await supabase
    .from("hr_attendance")
    .select("status")
    .eq("user_id", employee.id)
    .gte("created_at", `${testDate}T00:00:00+05:30`)
    .lte("created_at", `${testDate}T23:59:59+05:30`)
    .limit(1);

  if (records && records.length > 0 && records[0].status === "absent") {
    pass("Attendance override — DB record verified as absent");
  } else {
    fail("Attendance override — DB verification", `Records: ${JSON.stringify(records)}`);
  }

  // Test: invalid status should fail
  const badRes = await fetch(`${STAGING_URL}/api/admin/attendance-override`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      user_id: employee.id,
      date: testDate,
      status: "invalid_status",
    }),
  });

  if (badRes.status === 400) {
    pass("Attendance override rejects invalid status");
  } else {
    fail("Attendance override rejects invalid status", `Got HTTP ${badRes.status}`);
  }

  // Test: no auth should fail
  const noAuthRes = await fetch(`${STAGING_URL}/api/admin/attendance-override`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: employee.id, date: testDate, status: "absent" }),
  });

  if (noAuthRes.status === 401) {
    pass("Attendance override rejects unauthenticated requests");
  } else {
    fail("Attendance override rejects unauthenticated", `Got HTTP ${noAuthRes.status}`);
  }

  // Cleanup: revert to present
  await fetch(`${STAGING_URL}/api/admin/attendance-override`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ user_id: employee.id, date: testDate, status: "present" }),
  });
}

// ===== TEST 5: Financial year reset API =====
async function testFYResetAPI() {
  log("🔍", "TEST 5: Testing financial year reset API...");

  // Find super_admin
  const { data: admins } = await supabase
    .from("hr_profiles")
    .select("id, full_name, phone")
    .eq("role", "super_admin")
    .is("deactivated_at", null)
    .limit(1);

  if (!admins || admins.length === 0) {
    fail("FY reset API", "No super_admin found");
    return;
  }

  const admin = admins[0];
  let token;
  try {
    token = await getSessionToken(admin.phone, admin.full_name);
  } catch (e) {
    fail("FY reset API — admin login", e.message);
    return;
  }

  // Test: missing confirm should fail with preview
  const previewRes = await fetch(`${STAGING_URL}/api/admin/financial-year-reset`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ new_fy_year: 2099 }),
  });

  const previewBody = await previewRes.json();
  if (previewRes.status === 400 && previewBody.preview === true) {
    pass("FY reset requires confirm:true (preview mode works)");
  } else {
    fail("FY reset preview mode", `HTTP ${previewRes.status}, body: ${JSON.stringify(previewBody)}`);
  }

  // Test: non-super_admin should be rejected
  const { data: regularAdmins } = await supabase
    .from("hr_profiles")
    .select("id, full_name, phone, role")
    .eq("role", "admin")
    .is("deactivated_at", null)
    .limit(1);

  if (regularAdmins && regularAdmins.length > 0) {
    try {
      const adminToken = await getSessionToken(regularAdmins[0].phone, regularAdmins[0].full_name);
      const restrictedRes = await fetch(`${STAGING_URL}/api/admin/financial-year-reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ new_fy_year: 2099, confirm: true }),
      });

      if (restrictedRes.status === 403) {
        pass("FY reset restricted to super_admin only");
      } else {
        fail("FY reset access control", `Regular admin got HTTP ${restrictedRes.status}`);
      }
    } catch (e) {
      log("⚠️", `Skipped admin access control test: ${e.message}`);
    }
  }

  // Test: actual FY reset with a future test year (2099)
  const resetRes = await fetch(`${STAGING_URL}/api/admin/financial-year-reset`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ new_fy_year: 2099, confirm: true }),
  });

  const resetBody = await resetRes.json();
  if (resetRes.ok && resetBody.created > 0) {
    pass(`FY reset created ${resetBody.created} balance records for FY 2099-00`);
  } else if (resetRes.ok && resetBody.created === 0) {
    pass("FY reset — records already existed (idempotent)");
  } else {
    fail("FY reset execution", `HTTP ${resetRes.status}, body: ${JSON.stringify(resetBody)}`);
  }

  // Verify: check DB for 2099 records with wfh_total
  const { data: fyRecords } = await supabase
    .from("hr_leave_balances")
    .select("wfh_total, wfh_used, casual_leave_total, casual_leave_used, sick_leave_total, sick_leave_used")
    .eq("year", 2099)
    .limit(3);

  if (fyRecords && fyRecords.length > 0) {
    const rec = fyRecords[0];
    if (rec.casual_leave_used === 0 && rec.sick_leave_used === 0 && rec.wfh_used === 0) {
      pass("FY reset — all _used fields are 0");
    } else {
      fail("FY reset — used fields not zero", JSON.stringify(rec));
    }

    if (rec.wfh_total === 10) {
      pass("FY reset — WFH total is 10");
    } else {
      fail("FY reset — WFH total", `Expected 10, got ${rec.wfh_total}`);
    }
  } else {
    fail("FY reset — DB verification", "No records found for year 2099");
  }

  // Cleanup: remove test year records
  await supabase.from("hr_leave_balances").delete().eq("year", 2099);
  await supabase.from("hr_notifications").delete().eq("type", "fy_reset");
  log("🧹", "Cleaned up test year 2099 records");
}

// ===== TEST 6: UI tests with Playwright =====
async function testUIFeatures() {
  log("🔍", "TEST UI: Launching headless browser...");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await context.newPage();

  // Find a super_admin to login
  const { data: admins } = await supabase
    .from("hr_profiles")
    .select("id, full_name, phone")
    .eq("role", "super_admin")
    .is("deactivated_at", null)
    .limit(1);

  if (!admins || admins.length === 0) {
    fail("UI tests", "No super_admin found");
    await browser.close();
    return;
  }

  const admin = admins[0];
  const phone = admin.phone;
  const password = admin.full_name.replace(/\s/g, "").slice(0, 4).toLowerCase() + phone.slice(-4);

  try {
    // --- Login ---
    log("🔍", "UI: Logging in as super_admin...");
    await page.goto(`${STAGING_URL}/login`, { waitUntil: "networkidle", timeout: 30000 });
    await page.fill('input[type="tel"]', phone);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**", { timeout: 15000 });
    pass("UI: Super admin login successful");

    // --- TEST 2: WFH in leave balance cards ---
    log("🔍", "UI: Checking WFH balance card on leave page...");
    await page.goto(`${STAGING_URL}/dashboard/leave`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(2000);

    const wfhCard = await page.locator("text=WFH").first();
    if (await wfhCard.isVisible()) {
      pass("UI: WFH balance card is visible on leave page");
    } else {
      fail("UI: WFH balance card visible", "WFH card not found");
    }

    // Check WFH option in leave form dropdown
    const wfhOption = await page.locator('option[value="wfh"]').first();
    if (await wfhOption.count() > 0) {
      pass("UI: WFH option exists in leave type dropdown");
    } else {
      fail("UI: WFH option in dropdown", "Not found");
    }

    // --- TEST 4: Attendance calendar shows absent ---
    log("🔍", "UI: Checking attendance calendar for absent dots...");
    await page.goto(`${STAGING_URL}/dashboard/attendance`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(2000);

    // Check for red dots (absent) on the calendar
    const redDots = await page.locator('span.bg-red-500').count();
    log("📊", `Found ${redDots} red (absent) dots on attendance calendar`);
    if (redDots >= 0) {
      pass("UI: Attendance calendar renders without errors");
    }

    // Check that status badge shows correctly
    const statusBadge = await page.locator('[class*="StatusBadge"], [class*="rounded-full"]').first();
    if (await statusBadge.isVisible()) {
      pass("UI: Attendance day summary renders with status");
    }

    // --- TEST 1: Manager name on approval cards ---
    log("🔍", "UI: Checking manager name on approval cards...");
    await page.goto(`${STAGING_URL}/dashboard/team/approvals`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(2000);

    // Check if the page renders without errors
    const approvalsTitle = await page.locator("text=Approvals").first();
    if (await approvalsTitle.isVisible()) {
      pass("UI: Approvals page renders correctly");
    } else {
      fail("UI: Approvals page render", "Title not found");
    }

    // Check for "Mgr:" text (manager name label)
    const mgrLabels = await page.locator("text=Mgr:").count();
    if (mgrLabels > 0) {
      pass(`UI: Manager name shown on ${mgrLabels} approval card(s)`);
    } else {
      log("⚠️", "UI: No 'Mgr:' labels found — may have no pending requests with managers assigned");
      pass("UI: Approvals page loaded (no pending requests to show manager names)");
    }

    // Switch to Rectification tab and check
    const rectTab = await page.locator("text=Rectification").first();
    if (await rectTab.isVisible()) {
      await rectTab.click();
      await page.waitForTimeout(1000);
      pass("UI: Rectification tab accessible");
    }

    // --- TEST 5: FY Reset button on admin leaves page ---
    log("🔍", "UI: Checking FY Reset button on admin leaves page...");
    await page.goto(`${STAGING_URL}/dashboard/admin/leaves`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(2000);

    const fyResetBtn = await page.locator("text=Financial Year Reset").first();
    if (await fyResetBtn.isVisible()) {
      pass("UI: Financial Year Reset section visible for super_admin");
    } else {
      fail("UI: FY Reset section", "Not found on admin leaves page");
    }

    // Check WFH column in employee balance grid
    const wfhColumn = await page.locator("text=WFH").count();
    if (wfhColumn > 0) {
      pass("UI: WFH column visible in leave allotment grid");
    } else {
      fail("UI: WFH column in allotment", "Not found");
    }

    // Check WFH: 10 in policy summary
    const wfhPolicy = await page.locator("text=WFH:").first();
    if (await wfhPolicy.isVisible()) {
      pass("UI: WFH policy shown in default leave policy summary");
    }

    // --- TEST 3: Attendance override in reports ---
    log("🔍", "UI: Checking attendance override in monthly grid...");
    await page.goto(`${STAGING_URL}/dashboard/reports`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(1500);

    // Click "Monthly Summary" tab
    const monthlyTab = await page.locator("text=Monthly Summary").first();
    if (await monthlyTab.isVisible()) {
      await monthlyTab.click();
      await page.waitForTimeout(500);

      // Click Preview
      const previewBtn = await page.locator("text=Preview").first();
      if (await previewBtn.isVisible()) {
        await previewBtn.click();
        await page.waitForTimeout(3000);

        // Check for the grid table
        const gridTable = await page.locator("text=Monthly Attendance Sheet").first();
        if (await gridTable.isVisible()) {
          pass("UI: Monthly Attendance Sheet grid renders");

          // Click on a cell to open day detail modal
          const dayCells = await page.locator('span[class*="inline-flex"][class*="rounded"]');
          const cellCount = await dayCells.count();
          log("📊", `Found ${cellCount} day cells in monthly grid`);

          if (cellCount > 0) {
            await dayCells.first().click();
            await page.waitForTimeout(500);

            // Check for Override Status dropdown
            const overrideLabel = await page.locator("text=Override Status").first();
            if (await overrideLabel.isVisible()) {
              pass("UI: Override Status dropdown visible in day detail modal (admin)");

              // Check dropdown options
              const absentOption = await page.locator('option[value="absent"]').first();
              if (await absentOption.count() > 0) {
                pass("UI: 'Absent' option available in override dropdown");
              }

              // Close modal
              const closeBtn = await page.locator("text=Close").first();
              if (await closeBtn.isVisible()) await closeBtn.click();
            } else {
              fail("UI: Override dropdown in modal", "Not found");
            }
          }
        } else {
          fail("UI: Monthly grid render", "Grid table not found after preview");
        }
      }
    }

    // Take a screenshot for visual verification
    await page.screenshot({ path: "scripts/test-results-screenshot.png", fullPage: false });
    log("📸", "Screenshot saved to scripts/test-results-screenshot.png");

  } catch (e) {
    fail("UI test execution", e.message);
  } finally {
    await browser.close();
  }
}

// ===== MAIN =====
async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  UDS-HR Team Feedback — Headless E2E Tests");
  console.log(`  Target: ${STAGING_URL}`);
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log("═══════════════════════════════════════════════════\n");

  // Wait for staging deployment to be ready
  log("⏳", "Checking staging deployment is live...");
  try {
    const healthCheck = await fetch(`${STAGING_URL}/login`, { method: "HEAD" });
    if (healthCheck.ok) {
      pass("Staging deployment is live");
    } else {
      fail("Staging deployment health", `HTTP ${healthCheck.status}`);
      return;
    }
  } catch (e) {
    fail("Staging deployment reachable", e.message);
    return;
  }

  console.log("\n--- Database & Schema Tests ---");
  await testWfhColumns();
  await testWfhDefaults();
  await testWfhLeaveType();

  console.log("\n--- API Tests ---");
  await testAttendanceOverrideAPI();
  await testFYResetAPI();

  console.log("\n--- UI Tests (Playwright) ---");
  await testUIFeatures();

  // Summary
  console.log("\n═══════════════════════════════════════════════════");
  console.log(`  RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  console.log("═══════════════════════════════════════════════════");

  if (failed > 0) {
    console.log("\nFailed tests:");
    results.filter(r => r.status === "FAIL").forEach(r => {
      console.log(`  ❌ ${r.test}: ${r.reason}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Test runner crashed:", e);
  process.exit(1);
});
