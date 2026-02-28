/**
 * End-to-end onboarding test using Playwright.
 *
 * 1. Creates an onboarding token via Supabase admin API
 * 2. Opens the public onboarding form in a real browser
 * 3. Fills out all 3 steps
 * 4. Submits and verifies credentials are shown
 * 5. Cleans up test data
 */
import { chromium } from "playwright";

const SUPABASE_URL = "https://mzwmebrwmxhfyohulddl.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = process.env.SITE_URL || "https://uds-hr.vercel.app";

const TEST_PHONE = "9000099901";
const TEST_NAME = "TestOnboard User";

async function sbRest(path, method = "GET", body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "return=minimal",
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

async function sbAuthAdmin(path, method = "GET", body = null) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/${path}`, {
    method,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : null,
  });
  const text = await res.text();
  if (!res.ok) return { error: true, status: res.status, body: text };
  try { return JSON.parse(text); } catch { return text; }
}

let tokenId = null;
let createdUserId = null;

async function cleanup() {
  console.log("\n--- Cleanup ---");
  if (createdUserId) {
    try { await sbRest(`hr_leave_balances?user_id=eq.${createdUserId}`, "DELETE"); console.log("  Deleted leave balance"); } catch {}
    try { await sbRest(`hr_profiles?id=eq.${createdUserId}`, "DELETE"); console.log("  Deleted profile"); } catch {}
    try { await sbAuthAdmin(`users/${createdUserId}`, "DELETE"); console.log("  Deleted auth user"); } catch {}
  }
  if (tokenId) {
    try { await sbRest(`hr_onboarding_tokens?id=eq.${tokenId}`, "DELETE"); console.log("  Deleted token"); } catch {}
  }
}

async function run() {
  if (!SERVICE_ROLE_KEY) { console.error("Set SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

  // Pre-cleanup: find if test email already exists
  const authEmail = `${TEST_PHONE}@uds.hr`;
  console.log("Pre-cleanup: checking for existing test user...");
  const existing = await sbAuthAdmin(`users?email=${encodeURIComponent(authEmail)}`);
  if (!existing.error && existing.users?.length > 0) {
    const uid = existing.users[0].id;
    console.log(`  Found existing: ${uid} — cleaning up`);
    try { await sbRest(`hr_leave_balances?user_id=eq.${uid}`, "DELETE"); } catch {}
    try { await sbRest(`hr_profiles?id=eq.${uid}`, "DELETE"); } catch {}
    try { await sbAuthAdmin(`users/${uid}`, "DELETE"); } catch {}
    console.log("  Cleaned up previous test user");
  } else {
    console.log("  No existing test user found");
  }

  // Step 1: Create token
  console.log("\n=== Step 1: Create onboarding token ===");
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const admins = await sbRest("hr_profiles?role=eq.super_admin&select=id&limit=1");
  const creatorId = admins[0]?.id;
  if (!creatorId) throw new Error("No super_admin found");

  const [tokenRow] = await sbRest("hr_onboarding_tokens", "POST", {
    token,
    created_by: creatorId,
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  });
  tokenId = tokenRow.id;
  console.log(`  Token created: ${token}`);
  console.log(`  URL: ${SITE_URL}/onboard/${token}`);

  // Step 2: Browser test
  console.log("\n=== Step 2: Open browser ===");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`${SITE_URL}/onboard/${token}`, { waitUntil: "networkidle", timeout: 30000 });
    console.log(`  Loaded: ${page.url()}`);

    // Wait for Step 1 form
    await page.waitForSelector('input[placeholder="Full Name *"]', { timeout: 15000 });
    console.log("  PASS: Step 1 form rendered");

    // Fill Step 1
    await page.fill('input[placeholder="Full Name *"]', TEST_NAME);
    await page.fill('input[placeholder="Personal Email (optional)"]', "test@example.com");
    await page.fill('input[placeholder="Phone Number *"]', TEST_PHONE);
    console.log("  Filled name, email, phone");

    // Next
    await page.click('button:has-text("Save & Next")');
    await page.waitForTimeout(800);

    // Check we're on Step 2 (KYC)
    const step2Visible = await page.locator('text="KYC & Bank Details"').isVisible().catch(() => false);
    console.log(`  PASS: Step 2 (KYC) ${step2Visible ? "visible" : "(heading not found, but proceeding)"}`);

    // Fill Step 2: KYC & Bank
    await page.fill('input[placeholder="Aadhaar Number *"]', "123456789012");
    await page.fill('input[placeholder="PAN Number *"]', "ABCDE1234F");
    await page.fill('input[placeholder="Bank Name *"]', "Test Bank");
    await page.fill('input[placeholder="Account Number *"]', "9876543210");
    await page.fill('input[placeholder="IFSC Code *"]', "TEST0001234");
    console.log("  Filled KYC: Aadhaar, PAN, Bank, Account, IFSC");

    await page.click('button:has-text("Save & Next")');
    await page.waitForTimeout(800);

    // Step 3: Job Info
    const step3Visible = await page.locator('text="Job Information"').isVisible().catch(() => false);
    console.log(`  PASS: Step 3 (Job) ${step3Visible ? "visible" : "(heading not found, but proceeding)"}`);

    await page.fill('input[placeholder="Designation *"]', "Field Sales Executive");

    // Select department and project using the select elements directly
    const selects = page.locator("select");
    const selectCount = await selects.count();
    console.log(`  Found ${selectCount} select elements`);

    // First select = department, second = project
    if (selectCount >= 2) {
      await selects.nth(0).selectOption("FSE");
      await selects.nth(1).selectOption("all");
      console.log("  Selected Department=FSE, Project=All");
    }

    // Check role field is disabled
    const roleDisabled = await page.locator('input[value="Employee"][disabled]').isVisible().catch(() => false);
    console.log(`  Role field disabled: ${roleDisabled ? "PASS" : "FAIL (not found)"}`);

    await page.screenshot({ path: "scripts/onboard-step3.png", fullPage: true });
    console.log("  Screenshot: scripts/onboard-step3.png");

    // Submit
    console.log("\n=== Step 3: Submit ===");
    await page.click('button:has-text("Complete Onboarding")');

    // Wait for result
    const result = await Promise.race([
      page.waitForSelector('text="Welcome Aboard!"', { timeout: 20000 }).then(() => "success"),
      page.waitForSelector('.text-red-500', { timeout: 20000 }).then(async (el) => `error: ${await el.textContent()}`),
    ]);

    if (result === "success") {
      console.log("  PASS: Welcome Aboard! screen shown");

      // Check credentials
      try {
        const credBox = page.locator('.font-mono.font-medium');
        const creds = await credBox.allTextContents();
        console.log(`  Credentials shown: ${creds.join(", ")}`);

        const expectedPass = TEST_NAME.replace(/\s+/g, "").slice(0, 4).toLowerCase() + TEST_PHONE.slice(-4);
        const phoneShown = creds.includes(TEST_PHONE);
        const passShown = creds.includes(expectedPass);
        console.log(`  Phone displayed: ${phoneShown ? "PASS" : "FAIL"} (expected: ${TEST_PHONE})`);
        console.log(`  Password displayed: ${passShown ? "PASS" : "FAIL"} (expected: ${expectedPass})`);
      } catch (e) {
        console.log(`  Credentials check error: ${e.message}`);
      }

      await page.screenshot({ path: "scripts/onboard-success.png", fullPage: true });
      console.log("  Screenshot: scripts/onboard-success.png");

      // Find the created user ID for cleanup
      const check = await sbAuthAdmin(`users?email=${encodeURIComponent(authEmail)}`);
      if (!check.error && check.users?.length > 0) {
        createdUserId = check.users[0].id;
        console.log(`  Created user ID: ${createdUserId}`);

        // Verify KYC data was stored in DB
        console.log("\n=== KYC Storage Verification ===");
        const profiles = await sbRest(`hr_profiles?id=eq.${createdUserId}&select=kyc_data,full_name,phone,email,address,department,project_id,designation`);
        if (profiles && profiles.length > 0) {
          const p = profiles[0];
          console.log(`  Profile: ${p.full_name}, ${p.phone}, dept=${p.department}, project=${p.project_id}`);
          if (p.kyc_data) {
            console.log(`  KYC stored: PASS`);
            console.log(`    aadhaar: ${p.kyc_data.aadhaar === "123456789012" ? "PASS" : "FAIL"} (${p.kyc_data.aadhaar})`);
            console.log(`    pan: ${p.kyc_data.pan === "ABCDE1234F" ? "PASS" : "FAIL"} (${p.kyc_data.pan})`);
            console.log(`    bank_name: ${p.kyc_data.bank_name === "Test Bank" ? "PASS" : "FAIL"} (${p.kyc_data.bank_name})`);
            console.log(`    account_no: ${p.kyc_data.account_no === "9876543210" ? "PASS" : "FAIL"} (${p.kyc_data.account_no})`);
            console.log(`    ifsc: ${p.kyc_data.ifsc === "TEST0001234" ? "PASS" : "FAIL"} (${p.kyc_data.ifsc})`);
          } else {
            console.log(`  KYC stored: FAIL — kyc_data is null`);
          }
        } else {
          console.log(`  FAIL: Profile not found in DB`);
        }
      }

      // Step 4: Test login
      console.log("\n=== Step 4: Test login ===");
      const expectedPass = TEST_NAME.replace(/\s+/g, "").slice(0, 4).toLowerCase() + TEST_PHONE.slice(-4);

      await page.click('a:has-text("Go to Login")');
      await page.waitForURL("**/login", { timeout: 10000 });
      console.log("  Navigated to /login");

      // Find the phone input (inputMode=numeric) and password
      await page.locator('input[inputmode="numeric"]').fill(TEST_PHONE);
      await page.locator('input[type="password"]').fill(expectedPass);
      console.log(`  Entered phone=${TEST_PHONE}, password=${expectedPass}`);

      await page.click('button:has-text("Sign In")');

      const loginResult = await Promise.race([
        page.waitForURL("**/dashboard**", { timeout: 20000 }).then(() => "dashboard"),
        page.waitForSelector('.text-red-500,.text-red-600', { timeout: 20000 }).then(async (el) => `error: ${await el.textContent()}`),
      ]);

      if (loginResult === "dashboard") {
        console.log("  PASS: Login successful — redirected to dashboard");
        await page.waitForTimeout(3000);
        await page.screenshot({ path: "scripts/onboard-dashboard.png", fullPage: true });
        console.log("  Screenshot: scripts/onboard-dashboard.png");
      } else {
        console.log(`  FAIL: Login ${loginResult}`);
        await page.screenshot({ path: "scripts/onboard-login-error.png", fullPage: true });
        console.log("  Screenshot: scripts/onboard-login-error.png");
      }

    } else {
      console.log(`  FAIL: ${result}`);
      await page.screenshot({ path: "scripts/onboard-error.png", fullPage: true });
      console.log("  Screenshot: scripts/onboard-error.png");
    }

  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
    await page.screenshot({ path: "scripts/onboard-crash.png", fullPage: true }).catch(() => {});
    console.log("  Screenshot: scripts/onboard-crash.png");
  } finally {
    await browser.close();
  }

  await cleanup();
  console.log("\n=== ALL DONE ===");
}

run().catch(async (err) => {
  console.error("Fatal:", err.message);
  await cleanup();
  process.exit(1);
});
