import { test, expect } from "./fixtures";

test.describe("Sync Queue Resilience", () => {
  test("processes all queued items when coming back online", async ({
    loggedInPage: page,
  }) => {
    // 1. Go offline
    await page.context().setOffline(true);
    await page.waitForTimeout(500);

    // 2. Get the current user ID from localStorage cache keys
    const userId = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const cacheKey = keys.find((k) => k.startsWith("uds_cache_") && k.includes("_profile"));
      if (cacheKey) {
        // Extract user ID from key format: uds_cache_{userId}_profile
        const match = cacheKey.match(/^uds_cache_(.+)_profile$/);
        return match?.[1] || "test-user";
      }
      return "test-user";
    });

    // 3. Inject multiple queue items directly into localStorage
    const now = new Date().toISOString();
    await page.evaluate(
      ({ userId, now }) => {
        const items = [
          {
            id: "test-punch-in-001",
            type: "punch_in",
            payload: {
              user_id: userId,
              punch_in_at: now,
              punch_in_lat: 22.5726,
              punch_in_long: 88.3639,
            },
            timestamp: now,
            retryCount: 0,
          },
          {
            id: "test-location-001",
            type: "location_log",
            payload: {
              user_id: userId,
              lat: 22.5726,
              long: 88.3639,
              source: "punch_in",
            },
            timestamp: now,
            retryCount: 0,
          },
          {
            id: "test-punch-out-001",
            type: "punch_out",
            payload: {
              user_id: userId,
              punch_out_at: new Date(Date.now() + 3600000).toISOString(),
              punch_out_lat: 22.5726,
              punch_out_long: 88.3639,
              punch_in_at: now,
            },
            timestamp: new Date(Date.now() + 3600000).toISOString(),
            retryCount: 0,
          },
        ];
        localStorage.setItem("uds_sync_queue", JSON.stringify(items));
      },
      { userId, now }
    );

    // 4. Verify items are in the queue
    const queueBefore = await page.evaluate(() => {
      const raw = localStorage.getItem("uds_sync_queue");
      return raw ? JSON.parse(raw).length : 0;
    });
    expect(queueBefore).toBe(3);

    // 5. Go online and navigate to trigger sync hook
    await page.context().setOffline(false);
    await page.goto("/dashboard");
    await expect(page.getByText("Current Status")).toBeVisible({ timeout: 10_000 });

    // 6. Wait for all items to be processed (queue empties)
    await expect(async () => {
      const remaining = await page.evaluate(() => {
        const raw = localStorage.getItem("uds_sync_queue");
        return raw ? JSON.parse(raw).length : 0;
      });
      expect(remaining).toBe(0);
    }).toPass({ timeout: 20_000 });
  });

  test("moves item to dead letter after max retries", async ({
    loggedInPage: page,
  }) => {
    // 1. Go offline
    await page.context().setOffline(true);
    await page.waitForTimeout(500);

    // 2. Inject a leave_request item with retryCount at MAX_RETRIES - 1 (= 4)
    //    so the next failure pushes it to dead letter.
    //    Use leave_request type because it properly throws on Supabase error,
    //    unlike punch_in which swallows errors and returns null.
    //    Use a nonexistent user_id to guarantee RLS failure.
    await page.evaluate(() => {
      const items = [
        {
          id: "test-dead-letter-001",
          type: "leave_request",
          payload: {
            user_id: "00000000-0000-0000-0000-000000000000",
            type: "casual",
            start_date: "2099-01-01",
            end_date: "2099-01-02",
            reason: "dead letter test",
            attachment_url: null,
            status: "pending",
          },
          timestamp: new Date().toISOString(),
          retryCount: 4, // MAX_RETRIES is 5, so next failure = dead letter
        },
      ];
      localStorage.setItem("uds_sync_queue", JSON.stringify(items));
      // Clear any existing dead letter
      localStorage.removeItem("uds_sync_dead_letter");
    });

    // 3. Go online and navigate to trigger sync
    await page.context().setOffline(false);
    await page.goto("/dashboard");
    await expect(page.getByText("Current Status")).toBeVisible({ timeout: 10_000 });

    // 4. Wait for the item to be moved to dead letter queue
    await expect(async () => {
      const deadLetter = await page.evaluate(() => {
        const raw = localStorage.getItem("uds_sync_dead_letter");
        return raw ? JSON.parse(raw) : [];
      });
      expect(deadLetter.length).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 20_000 });

    // 5. Verify details of the dead letter item
    const deadLetter = await page.evaluate(() => {
      const raw = localStorage.getItem("uds_sync_dead_letter");
      return raw ? JSON.parse(raw) : [];
    });
    expect(deadLetter[0].id).toBe("test-dead-letter-001");
    expect(deadLetter[0].retryCount).toBe(5);

    // 6. Verify the item was removed from the active queue
    const activeQueue = await page.evaluate(() => {
      const raw = localStorage.getItem("uds_sync_queue");
      return raw ? JSON.parse(raw) : [];
    });
    const deadItem = activeQueue.find(
      (item: { id: string }) => item.id === "test-dead-letter-001"
    );
    expect(deadItem).toBeUndefined();
  });
});
