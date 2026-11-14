import { expect, test } from "@playwright/test";

/**
 * The Value Feed surface.
 *
 * Without a catalogue service the page says so rather than showing
 * placeholder cards. Behaviour with real content is in feed-live.spec.ts.
 */

test("the feed page is reachable and honest about its state", async ({ page }) => {
  const response = await page.goto("/learn");
  expect(response?.status()).toBe(200);

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your value feed");

  const body = (await page.textContent("body")) ?? "";
  expect(/unavailable|session|Building/i.test(body)).toBe(true);
});

test("the feed promises a finite session, not an endless one", async ({ page }) => {
  await page.goto("/learn");

  await expect(page.getByText(/stopping point/i)).toBeVisible();
  await expect(page.getByText(/not designed to keep you scrolling/i)).toBeVisible();
});
