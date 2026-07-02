/**
 * Quick test: verify monthly report shows full month data (not just 15 days)
 */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const PROD_URL = "https://Field Connect.vercel.app";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("Testing monthly report full-month data...\n");

  const { data: admin } = await supabase
    .from("hr_profiles")
    .select("phone, full_name")
    .eq("role", "super_admin")
    .is("deactivated_at", null)
    .limit(1)
    .single();

  const phone = admin.phone;
  const pwd = admin.full_name.replace(/\s/g, "").slice(0, 4).toLowerCase() + phone.slice(-4);

  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 430, height: 932 } })).newPage();

  try {
    // Login
    await page.goto(`${PROD_URL}/login`, { waitUntil: "networkidle", timeout: 30000 });
    await page.fill('input[type="tel"]', phone);
    await page.fill('input[type="password"]', pwd);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**", { timeout: 15000 });
    console.log("✅ Logged in");

    // Go to reports → Monthly Summary
    await page.goto(`${PROD_URL}/dashboard/reports`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(2000);

    await page.locator("button", { hasText: "Monthly Summary" }).click();
    await page.waitForTimeout(500);

    // Click Preview
    await page.locator("button", { hasText: "Preview" }).click();
    await page.waitForTimeout(5000);

    // Count status cells in the grid
    const statusCells = page.locator('span[class*="inline-flex"][class*="rounded"][class*="font-semibold"]');
    const totalCells = await statusCells.count();

    // Count employee rows
    const rows = page.locator('tr[class*="hover"]');
    const rowCount = await rows.count();

    // Count unique day columns by checking header
    const dayHeaders = page.locator('th[class*="min-w-"]');
    const dayCount = await dayHeaders.count();

    console.log(`\n📊 Monthly Grid Results:`);
    console.log(`   Employee rows: ${rowCount}`);
    console.log(`   Day columns: ${dayCount}`);
    console.log(`   Total status cells: ${totalCells}`);

    // Check: for March 2026, there should be cells for days 1-26 (today)
    // With 143 employees, if full data loads we should see much more than 1000 cells
    if (totalCells > 1000) {
      console.log(`\n✅ PASS: ${totalCells} cells > 1000 — full month data loading correctly`);
    } else if (totalCells > 500) {
      console.log(`\n⚠️  PARTIAL: ${totalCells} cells — more than before but may still be limited`);
    } else {
      console.log(`\n❌ FAIL: Only ${totalCells} cells — data may still be truncated`);
    }

    // Check the last day with data by looking at column headers
    // Find the rightmost cell with data
    const lastDayWithData = await page.evaluate(() => {
      const cells = document.querySelectorAll('span[class*="inline-flex"][class*="rounded"][class*="font-semibold"]');
      let maxDay = 0;
      cells.forEach(cell => {
        const td = cell.closest('td');
        if (td) {
          const row = td.closest('tr');
          if (row) {
            const tds = Array.from(row.querySelectorAll('td'));
            const idx = tds.indexOf(td);
            // First 2 cols are name + project, so day = idx - 1
            const day = idx - 1;
            if (day > maxDay) maxDay = day;
          }
        }
      });
      return maxDay;
    });

    console.log(`   Last day with data: Day ${lastDayWithData}`);

    if (lastDayWithData >= 25) {
      console.log(`✅ PASS: Data extends to day ${lastDayWithData} — full month coverage`);
    } else if (lastDayWithData >= 20) {
      console.log(`⚠️  Data goes to day ${lastDayWithData} — mostly covered`);
    } else {
      console.log(`❌ FAIL: Data only goes to day ${lastDayWithData} — still truncated`);
    }

    // Take screenshot
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);
    await page.screenshot({ path: "scripts/screenshots/monthly-fix-verify.png" });
    console.log("\n📸 Screenshot: scripts/screenshots/monthly-fix-verify.png");

    // Also scroll right to see later days
    await page.evaluate(() => {
      const scrollable = document.querySelector('.overflow-x-auto');
      if (scrollable) scrollable.scrollLeft = scrollable.scrollWidth;
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: "scripts/screenshots/monthly-fix-verify-right.png" });
    console.log("📸 Screenshot: scripts/screenshots/monthly-fix-verify-right.png");

  } catch (e) {
    console.error("❌ Error:", e.message);
  } finally {
    await browser.close();
  }
}

main();
