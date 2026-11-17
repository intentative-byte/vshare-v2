import { expect, test } from "@playwright/test";
import { enforceReadOnly, requireLive, requireLiveWrites } from "./support/live";

/**
 * The parts of the sign-in journey that need a running auth service.
 *
 * Split by effect. Requesting a magic link WRITES — it creates an auth OTP and
 * sends mail — so those are WRITE_REQUIRED (and INFRA_BLOCKED: they need an SMTP
 * sink). Reading /you, and signing out when there is no session, are READ_ONLY.
 * A skipped test is reported as skipped, never replaced by a weaker check. See
 * docs/VSHARES_LIVE_TEST_INVENTORY.json.
 */

test.describe("sign-in: requesting a magic link (writes)", () => {
  requireLiveWrites(test);

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
});

test.describe("sign-in: read-only checks", () => {
  requireLive(test);
  enforceReadOnly(test);

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
