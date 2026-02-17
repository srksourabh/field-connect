import { test, expect } from "./fixtures";

/**
 * Helper to perform a swipe gesture on the PunchToggle slider.
 * Uses mouse events (mousedown on thumb, mousemove, mouseup) to simulate the drag.
 */
async function swipePunchSlider(
  page: import("@playwright/test").Page,
  direction: "right" | "left"
) {
  // The thumb: absolute positioned, white circle with shadow
  const thumb = page.locator(
    "div.absolute.rounded-full.bg-white.shadow-lg"
  ).first();
  await expect(thumb).toBeVisible();

  // Get the track (parent element)
  const thumbBox = await thumb.boundingBox();
  // The track is the direct parent div with the rounded-full class
  const track = page.locator("div.relative.h-16.rounded-full").first();
  const trackBox = await track.boundingBox();

  if (!thumbBox || !trackBox) throw new Error("Could not locate punch slider");

  const startX = thumbBox.x + thumbBox.width / 2;
  const y = thumbBox.y + thumbBox.height / 2;
  const endX =
    direction === "right"
      ? trackBox.x + trackBox.width - 5
      : trackBox.x + 5;

  // Hover the thumb first to ensure we're on it
  await thumb.hover();
  await page.waitForTimeout(100);

  // Perform the drag
  await page.mouse.down();
  const steps = 25;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      startX + ((endX - startX) * i) / steps,
      y
    );
    await page.waitForTimeout(15);
  }
  await page.mouse.up();
}

test.describe("Offline Punch In/Out", () => {
  test("queues punch actions offline and syncs when back online", async ({
    loggedInPage: page,
  }) => {
    // 1. Confirm we're on the dashboard with the punch card
    await expect(page.getByText("Current Status")).toBeVisible();
    await expect(page.getByText("Slide to Punch In")).toBeVisible();

    // 2. Go offline
    await page.context().setOffline(true);
    await expect(page.getByText("Offline Mode")).toBeVisible({ timeout: 5_000 });

    // 3. Punch In — swipe right
    await swipePunchSlider(page, "right");

    // 4. Verify punch-in occurred
    await expect(page.getByText("Punched In")).toBeVisible({ timeout: 5_000 });

    // 5. Verify sync queue has a punch_in item
    const queueAfterPunchIn = await page.evaluate(() => {
      const raw = localStorage.getItem("uds_sync_queue");
      return raw ? JSON.parse(raw) : [];
    });
    expect(
      queueAfterPunchIn.some((item: { type: string }) => item.type === "punch_in")
    ).toBe(true);

    // 6. Wait for animation to settle, then punch out — swipe left
    await page.waitForTimeout(2000);
    await swipePunchSlider(page, "left");

    // 7. Verify punch-out
    await expect(page.getByText("Slide to Punch In")).toBeVisible({
      timeout: 5_000,
    });

    // 8. Queue should now have punch_in + punch_out items
    const queueAfterPunchOut = await page.evaluate(() => {
      const raw = localStorage.getItem("uds_sync_queue");
      return raw ? JSON.parse(raw) : [];
    });
    const types = queueAfterPunchOut.map((item: { type: string }) => item.type);
    expect(types).toContain("punch_in");
    expect(types).toContain("punch_out");

    // 9. Go back online and navigate to trigger sync
    await page.context().setOffline(false);
    await page.goto("/dashboard");
    await expect(page.getByText("Current Status")).toBeVisible({
      timeout: 10_000,
    });

    // 10. Wait for sync — queue should empty
    await expect(async () => {
      const remaining = await page.evaluate(() => {
        const raw = localStorage.getItem("uds_sync_queue");
        return raw ? JSON.parse(raw).length : 0;
      });
      expect(remaining).toBe(0);
    }).toPass({ timeout: 20_000 });
  });
});
