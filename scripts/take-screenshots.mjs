// Screenshot capture script for Field Connect User Guide
// Usage: node scripts/take-screenshots.mjs <phone> <password>

import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, "..", "docs", "screenshots");
const BASE_URL = "http://localhost:3000";

const phone = process.argv[2];
const password = process.argv[3];

if (!phone || !password) {
  console.error("Usage: node scripts/take-screenshots.mjs <phone> <password>");
  process.exit(1);
}

async function screenshot(page, name, opts = {}) {
  const fpath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.waitForTimeout(1500); // let animations settle
  await page.screenshot({ path: fpath, fullPage: opts.fullPage ?? false });
  console.log(`  ✓ ${name}.png`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 size (mobile-first)
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log("Taking screenshots...\n");

  // === PUBLIC PAGES ===

  // Landing page
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
  await screenshot(page, "01-landing-page");

  // Login page
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await screenshot(page, "02-login-page");

  // Login - fill form
  await page.fill('input[type="tel"], input[placeholder*="phone" i], input[name="phone"]', phone);
  await page.waitForTimeout(300);
  await screenshot(page, "03-login-filled");

  // Actually login
  await page.fill('input[type="password"]', password);
  await page.waitForTimeout(300);

  // Find and click submit button
  const submitBtn = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').first();
  await submitBtn.click();

  // Wait for navigation to dashboard
  await page.waitForURL("**/dashboard**", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000); // let dashboard data load

  // === DASHBOARD ===
  await screenshot(page, "04-dashboard-top");

  // Scroll down to see activity grid
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(800);
  await screenshot(page, "05-dashboard-activity");

  // Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  await screenshot(page, "06-dashboard-bottom");

  // === ATTENDANCE ===
  await page.goto(`${BASE_URL}/dashboard/attendance`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await screenshot(page, "07-attendance-calendar");

  // Scroll for full calendar
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(500);
  await screenshot(page, "08-attendance-calendar-full");

  // === RECTIFICATION ===
  await page.goto(`${BASE_URL}/dashboard/attendance/rectification`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await screenshot(page, "09-rectification-form");

  // === LEAVE ===
  await page.goto(`${BASE_URL}/dashboard/leave`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await screenshot(page, "10-leave-balance");

  // Scroll to see form + history
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(500);
  await screenshot(page, "11-leave-form");

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await screenshot(page, "12-leave-history");

  // === PROFILE ===
  await page.goto(`${BASE_URL}/dashboard/profile`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await screenshot(page, "13-profile-top");

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await screenshot(page, "14-profile-menu");

  // === TEAM ===
  await page.goto(`${BASE_URL}/dashboard/team`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  await screenshot(page, "15-team-organogram");

  // === TEAM TRACKING ===
  await page.goto(`${BASE_URL}/dashboard/team/tracking`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  await screenshot(page, "16-team-tracking-map");

  // === APPROVALS ===
  await page.goto(`${BASE_URL}/dashboard/team/approvals`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await screenshot(page, "17-approvals-top");

  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(500);
  await screenshot(page, "18-approvals-list");

  // === REPORTS ===
  await page.goto(`${BASE_URL}/dashboard/reports`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await screenshot(page, "19-reports-page");

  // === ANALYTICS ===
  await page.goto(`${BASE_URL}/dashboard/analytics`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  await screenshot(page, "20-analytics-top");

  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(500);
  await screenshot(page, "21-analytics-charts");

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await screenshot(page, "22-analytics-bottom");

  // === ADMIN ===
  await page.goto(`${BASE_URL}/dashboard/admin`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await screenshot(page, "23-admin-employees");

  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(500);
  await screenshot(page, "24-admin-employee-list");

  // === ADD EMPLOYEE ===
  await page.goto(`${BASE_URL}/dashboard/admin/employees`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await screenshot(page, "25-add-employee-form");

  // === LEAVE ALLOTMENT ===
  await page.goto(`${BASE_URL}/dashboard/admin/leaves`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await screenshot(page, "26-leave-allotment");

  // === ADMIN MAP ===
  await page.goto(`${BASE_URL}/dashboard/admin/map`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  await screenshot(page, "27-admin-map");

  // === NOTIFICATIONS ===
  await page.goto(`${BASE_URL}/dashboard/admin/notifications`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await screenshot(page, "28-broadcast-notifications");

  // === ONBOARDING ===
  await page.goto(`${BASE_URL}/dashboard/onboarding`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await screenshot(page, "29-onboarding-tokens");

  // === ORGANISATION HUB ===
  await page.goto(`${BASE_URL}/dashboard/organisation`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await screenshot(page, "30-organisation-hub");

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await screenshot(page, "31-organisation-hub-bottom");

  // === LEAVE POLICIES ===
  await page.goto(`${BASE_URL}/dashboard/organisation/leave-policies`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await screenshot(page, "32-leave-policies");

  // === MASTER DATA - PROJECTS ===
  await page.goto(`${BASE_URL}/dashboard/organisation/projects`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await screenshot(page, "33-master-projects");

  // === MASTER DATA - DEPARTMENTS ===
  await page.goto(`${BASE_URL}/dashboard/organisation/departments`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await screenshot(page, "34-master-departments");

  // === MASTER DATA - DESIGNATIONS ===
  await page.goto(`${BASE_URL}/dashboard/organisation/designations`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await screenshot(page, "35-master-designations");

  // === HR INBOX ===
  await page.goto(`${BASE_URL}/dashboard/organisation/hr-inbox`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await screenshot(page, "36-hr-inbox");

  // === MY PROJECTS ===
  await page.goto(`${BASE_URL}/dashboard/my-projects`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await screenshot(page, "37-my-projects");

  // === MESSAGE HR ===
  await page.goto(`${BASE_URL}/dashboard/message-hr`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await screenshot(page, "38-message-hr");

  // === QR PAGE ===
  await page.goto(`${BASE_URL}/dashboard/qr`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await screenshot(page, "39-qr-placeholder");

  // === SIDEBAR / NAVIGATION ===
  // Try to open the sidebar/hamburger
  const hamburger = page.locator('button[aria-label*="menu" i], button:has(svg.lucide-menu), [data-testid="menu-button"]').first();
  if (await hamburger.isVisible().catch(() => false)) {
    await hamburger.click();
    await page.waitForTimeout(800);
    await screenshot(page, "40-sidebar-menu");
  }

  // === BOTTOM NAV ===
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  // Crop just the bottom nav area
  await page.evaluate(() => window.scrollTo(0, 0));
  await screenshot(page, "41-bottom-nav");

  // === NOTIFICATIONS BELL ===
  // Look for the notification bell icon on dashboard
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const bell = page.locator('button:has(svg.lucide-bell), [aria-label*="notification" i]').first();
  if (await bell.isVisible().catch(() => false)) {
    await bell.click();
    await page.waitForTimeout(1500);
    await screenshot(page, "42-notifications-panel");
  }

  await browser.close();
  console.log("\nDone! All screenshots saved to docs/screenshots/");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
