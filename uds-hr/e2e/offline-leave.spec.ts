import { test, expect } from "./fixtures";

test.describe("Offline Leave Request", () => {
  test("submits leave request offline and syncs when back online", async ({
    loggedInPage: page,
  }) => {
    // 1. Navigate to leave page
    await page.goto("/dashboard/leave");
    await expect(page.getByText("Leave Application")).toBeVisible({
      timeout: 10_000,
    });

    // 2. Wait for balance cards to load (the "My Balances" section)
    await expect(page.getByText("My Balances")).toBeVisible({ timeout: 10_000 });

    // 3. Go offline
    await page.context().setOffline(true);
    await page.waitForTimeout(500);

    // 4. Fill the leave form
    // Select leave type — "casual" is already the default
    const startDateInput = page.locator('input[type="date"]').first();
    const endDateInput = page.locator('input[type="date"]').nth(1);

    // Set dates: tomorrow and day after
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    await startDateInput.fill(formatDate(tomorrow));
    await endDateInput.fill(formatDate(dayAfter));

    // Fill reason
    await page
      .locator("textarea")
      .fill("E2E test: offline leave request");

    // 5. Submit
    await page.getByText("Submit Request").click();

    // 6. Verify success message appears
    await expect(
      page.getByText("Leave request submitted successfully!")
    ).toBeVisible({ timeout: 5_000 });

    // 7. Verify localStorage queue has a leave_request item
    const queue = await page.evaluate(() => {
      const raw = localStorage.getItem("uds_sync_queue");
      return raw ? JSON.parse(raw) : [];
    });
    const leaveItems = queue.filter(
      (item: { type: string }) => item.type === "leave_request"
    );
    expect(leaveItems.length).toBeGreaterThanOrEqual(1);

    // Verify the queued payload has correct fields
    const payload = leaveItems[0].payload;
    expect(payload.type).toBe("casual");
    expect(payload.start_date).toBe(formatDate(tomorrow));
    expect(payload.end_date).toBe(formatDate(dayAfter));
    expect(payload.reason).toBe("E2E test: offline leave request");
    expect(payload.status).toBe("pending");

    // 8. Go back online
    await page.context().setOffline(false);

    // Trigger sync by navigating to dashboard (forces useSyncQueue to remount and flush)
    await page.goto("/dashboard");
    await expect(page.getByText("Current Status")).toBeVisible({ timeout: 10_000 });

    // 9. Wait for sync to flush the queue
    await expect(async () => {
      const remaining = await page.evaluate(() => {
        const raw = localStorage.getItem("uds_sync_queue");
        return raw ? JSON.parse(raw).length : 0;
      });
      expect(remaining).toBe(0);
    }).toPass({ timeout: 20_000 });
  });
});
