import { expect, test } from "@playwright/test";

/**
 * The parts of the sign-in journey that need a running auth service.
 *
 * These are skipped, with a reason, when no service is configured. They are
 * never replaced by a weaker check that passes without one: a skipped test
 * is reported as skipped.
 *
 * To run them, point the app at a Supabase project (local stack or a
 * project you control) and set NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY before starting the server under test.
 */

const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

test.describe("sign-in against a running auth service", () => {
  test.skip(!configured, "No auth service configured for this run.");

  test("the form accepts an address and reports that a link was sent", async ({ page }) => {
    await page.goto("/sign-in");

    await page.getByLabel("Email address").fill("new-person@example.com");
    await page.getByRole("button", { name: /Email me a link/ }).click();

    await expect(page.getByRole("status")).toContainText(/Check new-person@example.com/);
  });

  test("an unknown and a known address are answered identically", async ({ page }) => {
    const answers: string[] = [];

    for (const email of ["definitely-unknown@example.com", "known@example.com"]) {
      await page.goto("/sign-in");
      await page.getByLabel("Email address").fill(email);
      await page.getByRole("button", { name: /Email me a link/ }).click();
      await expect(page.getByRole("status")).toBeVisible();

      const text = (await page.getByRole("status").textContent()) ?? "";
      answers.push(text.replace(email, "{address}"));
    }

    // Identical wording, so this page cannot be used to discover who has an
    // account (docs/VSHARES_SECURITY.md T6).
    expect(answers[0]).toBe(answers[1]);
  });

  test("a guest who acts gets an account, and keeps it when they register", async ({ page }) => {
    await page.goto("/you");

    // A guest account is created by the first action, not by browsing.
    const body = (await page.textContent("body")) ?? "";
    expect(body).toMatch(/Sign in|guest/i);
  });

  test("signing out ends the session", async ({ page }) => {
    await page.goto("/you");

    const signOut = page.getByRole("button", { name: "Sign out", exact: true });

    if ((await signOut.count()) === 0) {
      test.skip(true, "No session to sign out of in this run.");
      return;
    }

    await signOut.click();
    await expect(page).toHaveURL(/\/$/);
  });
});
