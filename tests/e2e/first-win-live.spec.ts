import { expect, test } from "@playwright/test";

/**
 * The complete first learning win, with a catalogue behind it.
 *
 * Skipped with a reason when no database is configured. See
 * docs/VSHARES_VERIFICATION_PROCEDURE.md.
 */

const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

test.describe("first learning win", () => {
  test.skip(!configured, "No database configured for this run.");

  test("a visitor reaches a useful card with no account", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Budgeting/ }).click();

    await expect(page.getByText("What you take away")).toBeVisible();
    await expect(page.getByText("Your next step")).toBeVisible();
    await expect(page.getByRole("button", { name: "Got it" })).toBeVisible();

    // Nothing has been stored about them yet: no session cookie means no
    // account was created merely by reading.
    const cookies = await page.context().cookies();
    expect(cookies.filter((cookie) => cookie.name.includes("auth"))).toHaveLength(0);
  });

  test("completing produces a win summary and a non-blocking offer", async ({ page }) => {
    await page.goto("/start/budgeting");
    await page.getByRole("button", { name: "Got it" }).click();

    await expect(page.getByText("Your first win")).toBeVisible();
    await expect(page.getByText(/counts as one completed resource/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Keep my progress" })).toBeVisible();
    // The offer does not block: carrying on is right there.
    await expect(page.getByRole("link", { name: "Keep learning" })).toBeVisible();
    await expect(page.getByText(/carry on without an account/)).toBeVisible();
  });

  test("the completion survives into the progress dashboard", async ({ page }) => {
    await page.goto("/start/budgeting");
    await page.getByRole("button", { name: "Got it" }).click();
    await expect(page.getByText("Your first win")).toBeVisible();

    await page.goto("/you");

    await expect(page.getByText("Resources completed")).toBeVisible();
    await expect(page.getByText("Opening something does not count")).toBeVisible();
  });

  test("saving puts something in the library and it can be removed", async ({ page }) => {
    await page.goto("/start/budgeting");
    await page.getByRole("button", { name: "Got it" }).click();
    await page.getByRole("button", { name: "Save this for later" }).click();

    await page.goto("/saved");

    await expect(page.getByRole("button", { name: "Remove" }).first()).toBeVisible();
    await page.getByRole("button", { name: "Remove" }).first().click();
    await expect(page.getByText("Nothing saved yet")).toBeVisible();
  });

  test("the path tab names a next step and the rule behind it", async ({ page }) => {
    await page.goto("/path");

    await expect(page.getByText("Next best")).toBeVisible();
    await expect(page.getByRole("button", { name: "How this was chosen" })).toBeVisible();
  });
});
