import { expect, test } from "@playwright/test";
import { enforceReadOnly, requireLive } from "./support/live";

/**
 * Catalogue behaviour that needs a database with the seed applied.
 *
 * READ-ONLY: these only read. Skipped with a reason when no live service is
 * configured, never replaced by a weaker check. The read-only tripwire fails
 * the test if the browser issues any mutating request. See
 * docs/VSHARES_VERIFICATION_PROCEDURE.md and docs/VSHARES_LIVE_TEST_INVENTORY.json.
 */

test.describe("catalogue with a database", () => {
  requireLive(test);
  enforceReadOnly(test);

  test("explore lists the categories from the database", async ({ page }) => {
    await page.goto("/explore");

    await expect(page.getByRole("link", { name: /Technology and AI/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Personal Finance/ })).toBeVisible();
  });

  test("a category page lists its topics and warns on high-impact ones", async ({ page }) => {
    await page.goto("/explore/personal-finance");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Personal Finance");
    await expect(page.getByText("Educational, not advice.")).toBeVisible();
    // "Budgeting" is the topic list item; the page also has an "In Budgeting"
    // heading below it, so match the list item exactly rather than any text.
    await expect(page.getByText("Budgeting", { exact: true })).toBeVisible();
  });

  test("an unpublished card is not reachable in public", async ({ page }) => {
    // Seeded cards are drafts until their links are checked and they are
    // reviewed, so none of them should be readable yet.
    const response = await page.goto("/c/getting-to-sleep-nhs-guidance");

    expect(response?.status()).toBe(404);
  });
});
