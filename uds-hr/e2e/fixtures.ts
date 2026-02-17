import { test as base, expect, type Page } from "@playwright/test";

// Test credentials — default password is first 4 chars of name (lowercase) + last 4 digits of phone
const TEST_PHONE = "9836719911";
const TEST_PASSWORD = "sour9911"; // "sour" (first 4 of "Sourabh") + "9911" (last 4 of phone)

/** Logs in to the app and waits for the dashboard to load. */
async function login(page: Page) {
  await page.goto("/login", { waitUntil: "networkidle" });

  // Wait for login form to be fully rendered
  const phoneInput = page.locator('input[type="tel"]');
  await expect(phoneInput).toBeVisible({ timeout: 15_000 });

  // Use click + pressSequentially to ensure React's onChange fires for controlled inputs
  await phoneInput.click();
  await phoneInput.fill("");
  await phoneInput.pressSequentially(TEST_PHONE, { delay: 50 });

  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.click();
  await passwordInput.fill("");
  await passwordInput.pressSequentially(TEST_PASSWORD, { delay: 50 });

  // Wait for button to become enabled (React state update)
  const submitBtn = page.locator('button[type="submit"]');
  await expect(submitBtn).toBeEnabled({ timeout: 5_000 });
  await submitBtn.click();

  // Wait for redirect to dashboard — the greeting text confirms we're logged in
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await expect(page.locator("text=Good")).toBeVisible({ timeout: 10_000 });
}

/**
 * Extended test fixture that provides a logged-in page.
 * Usage:  import { test, expect } from "./fixtures";
 */
export const test = base.extend<{ loggedInPage: Page }>({
  loggedInPage: async ({ page }, use) => {
    await login(page);
    await use(page);
  },
});

export { expect, login };
