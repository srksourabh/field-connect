import { test, expect } from "./fixtures";

test.describe("Cached Data Display", () => {
  test("caches profile, leave, and attendance data to localStorage", async ({
    loggedInPage: page,
  }) => {
    // 1. On dashboard (online) — wait for data to load and cache
    await expect(page.locator("text=Good")).toBeVisible({ timeout: 10_000 });

    // Wait for profile name to appear (confirms auth + profile loaded)
    const profileName = page.locator("header p.text-lg.font-bold");
    await expect(profileName).toBeVisible({ timeout: 10_000 });
    const nameText = await profileName.textContent();
    expect(nameText).toBeTruthy();
    expect(nameText).not.toBe("User");

    // Wait for cache writes to complete
    await page.waitForTimeout(2000);

    // 2. Verify profile is cached
    const cachedProfile = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const profileKey = keys.find((k) => k.startsWith("uds_cache_") && k.endsWith("_profile"));
      if (!profileKey) return null;
      try {
        return JSON.parse(localStorage.getItem(profileKey) || "null");
      } catch {
        return null;
      }
    });
    expect(cachedProfile).not.toBeNull();
    expect(cachedProfile.data).toBeTruthy();
    expect(cachedProfile.data.full_name).toBeTruthy();
    expect(cachedProfile.updatedAt).toBeGreaterThan(0);

    // 3. Navigate to leave page to trigger leave data caching
    await page.goto("/dashboard/leave");
    await expect(page.getByText("My Balances")).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(2000);

    // Verify leave balance is cached
    const cachedLeaveBalance = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const balanceKey = keys.find(
        (k) => k.startsWith("uds_cache_") && k.includes("leave_balance")
      );
      if (!balanceKey) return null;
      try {
        return JSON.parse(localStorage.getItem(balanceKey) || "null");
      } catch {
        return null;
      }
    });
    expect(cachedLeaveBalance).not.toBeNull();
    expect(cachedLeaveBalance.updatedAt).toBeGreaterThan(0);

    // 4. Navigate to attendance page to trigger attendance data caching
    await page.goto("/dashboard/attendance");
    await expect(page.getByText("Attendance History")).toBeVisible({
      timeout: 10_000,
    });
    await page.waitForTimeout(2000);

    // Verify attendance data is cached
    const cachedAttendance = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const attendanceKey = keys.find(
        (k) => k.startsWith("uds_cache_") && k.includes("attendance_")
      );
      if (!attendanceKey) return null;
      try {
        return JSON.parse(localStorage.getItem(attendanceKey) || "null");
      } catch {
        return null;
      }
    });
    expect(cachedAttendance).not.toBeNull();
    expect(cachedAttendance.updatedAt).toBeGreaterThan(0);

    // 5. Go offline and verify cached data is still accessible in localStorage
    await page.context().setOffline(true);

    const allCacheKeys = await page.evaluate(() => {
      return Object.keys(localStorage).filter((k) => k.startsWith("uds_cache_"));
    });
    // Should have at least profile + leave balance + attendance cached
    expect(allCacheKeys.length).toBeGreaterThanOrEqual(3);

    // 6. Verify cached profile data matches what was displayed
    const offlineProfile = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const profileKey = keys.find((k) => k.startsWith("uds_cache_") && k.endsWith("_profile"));
      if (!profileKey) return null;
      try {
        return JSON.parse(localStorage.getItem(profileKey) || "null");
      } catch {
        return null;
      }
    });
    expect(offlineProfile).not.toBeNull();
    expect(offlineProfile.data.full_name).toBe(cachedProfile.data.full_name);

    // 7. Go back online for cleanup
    await page.context().setOffline(false);
  });
});
