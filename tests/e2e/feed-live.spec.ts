import { expect, test } from "@playwright/test";

/**
 * The feed with a real catalogue behind it.
 *
 * Skipped with a reason when no database is configured, never replaced by
 * a weaker check. See docs/VSHARES_VERIFICATION_PROCEDURE.md.
 */

const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

test.describe("value session with a catalogue", () => {
  test.skip(!configured, "No database configured for this run.");

  test("a session shows position, progress and a stopping point", async ({ page }) => {
    await page.goto("/learn");

    await expect(page.getByText(/Card 1 of/)).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Session progress" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Got it" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Read the original" })).toBeVisible();
  });

  test("a recommendation can explain itself", async ({ page }) => {
    await page.goto("/learn");

    await page.getByRole("button", { name: "Why this?" }).click();

    const reasons = page.locator("ul li", { hasText: /./ });
    await expect(reasons.first()).toBeVisible();
  });

  test("the session ends with a summary and does not refill", async ({ page }) => {
    await page.goto("/learn");

    // Walk to the end of the session.
    for (let step = 0; step < 10; step += 1) {
      const next = page.getByRole("button", { name: /Next|Finish session/ });

      if ((await next.count()) === 0) {
        break;
      }

      await next.click();
    }

    await expect(page.getByText("Session complete")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start another session" })).toBeVisible();
    // Starting another session is a deliberate act, never automatic.
    await expect(page.getByText(/Card 1 of/)).toHaveCount(0);
  });

  test("opening a card does not record it as completed", async ({ page }) => {
    await page.goto("/learn");

    const gotIt = page.getByRole("button", { name: "Got it" });
    await expect(gotIt).toBeVisible();
    // The control still reads as unfinished: merely viewing changed nothing.
    await expect(gotIt).not.toHaveText(/✓/);
  });
});
