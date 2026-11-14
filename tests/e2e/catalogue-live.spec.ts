import { expect, test } from "@playwright/test";

/**
 * Catalogue behaviour that needs a database with the seed applied.
 *
 * Skipped with a reason when none is configured, never replaced by a
 * weaker check. See docs/VSHARES_VERIFICATION_PROCEDURE.md.
 */

const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

test.describe("catalogue with a database", () => {
  test.skip(!configured, "No database configured for this run.");

  test("explore lists the categories from the database", async ({ page }) => {
    await page.goto("/explore");

    await expect(page.getByRole("link", { name: /Technology and AI/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Personal Finance/ })).toBeVisible();
  });

  test("a category page lists its topics and warns on high-impact ones", async ({ page }) => {
    await page.goto("/explore/personal-finance");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Personal Finance");
    await expect(page.getByText("Educational, not advice.")).toBeVisible();
    await expect(page.getByText("Budgeting")).toBeVisible();
  });

  test("an unpublished card is not reachable in public", async ({ page }) => {
    // Seeded cards are drafts until their links are checked and they are
    // reviewed, so none of them should be readable yet.
    const response = await page.goto("/c/getting-to-sleep-nhs-guidance");

    expect(response?.status()).toBe(404);
  });
});
