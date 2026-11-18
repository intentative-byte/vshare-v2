import { expect, test } from "@playwright/test";

/**
 * Catalogue surfaces.
 *
 * Explore and the public card pages read from the database. Without one
 * configured they show an honest unavailable state rather than placeholder
 * content, and that is what these check. The behaviour with data is covered
 * by the database suite and by catalogue-live.spec.ts.
 */

test("explore is reachable and says what it has", async ({ page }) => {
  const response = await page.goto("/explore");
  expect(response?.status()).toBe(200);

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Categories");

  const body = (await page.textContent("body")) ?? "";
  expect(
    /unavailable|being prepared|topics/i.test(body),
    "explore should show categories, an empty state, or an unavailable state",
  ).toBe(true);
});

test("a card page for an unknown slug is not found", async ({ page }) => {
  const response = await page.goto("/c/no-such-card-exists-here");

  expect(response?.status()).toBe(404);
});

test("the admin area is not reachable without a role", async ({ page }) => {
  // Not found rather than forbidden: an account without a role learns
  // nothing about whether the area exists.
  for (const route of ["/admin", "/admin/queue"]) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(404);
  }
});

test("the admin area is not linked from the application shell", async ({ page }) => {
  await page.goto("/learn");

  const adminLinks = page.locator('a[href^="/admin"]');
  await expect(adminLinks).toHaveCount(0);
});
