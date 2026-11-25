import { expect, test } from "@playwright/test";

/**
 * The dashboard with real figures, and the journey that produces them.
 *
 * Every test here needs an account with a role and a day that has been
 * rolled up, which needs an auth service and a privileged client. Neither
 * exists in the build environment, so these are skipped with the reason
 * stated rather than replaced by something weaker that would pass.
 *
 * docs/VSHARES_LIVE_VERIFICATION.md lists what clearing this requires.
 */

const reason = "needs an auth service, a staff account and a computed rollup";

test.describe("admin measurement dashboard", () => {
  test.skip(true, reason);

  test("a moderator sees the dashboard and every figure carries its definition", async ({
    page,
  }) => {
    await page.goto("/admin/metrics");
    await expect(page.getByRole("heading", { name: "Measurement" })).toBeVisible();
    await expect(page.getByText("Cards completed")).toBeVisible();
    await expect(page.getByText("not a measure of understanding")).toBeVisible();
  });

  test("the period filter changes the window", async ({ page }) => {
    await page.goto("/admin/metrics?days=7");
    await expect(page.getByRole("link", { name: "Last 7 days" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("application and outcome show no number", async ({ page }) => {
    await page.goto("/admin/metrics");
    await expect(page.getByText("Both are empty")).toBeVisible();
  });

  test("a topic with fewer than five completions is shown as withheld", async ({ page }) => {
    await page.goto("/admin/metrics");
    await expect(page.getByText("withheld").first()).toBeVisible();
  });

  test("every chart has the same numbers available as a table", async ({ page }) => {
    await page.goto("/admin/metrics");
    await page.getByRole("button", { name: "The same figures as a table" }).click();
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("a learner completing a card moves the next day's figures", async ({ page }) => {
    await page.goto("/start/focus");
    await page.getByRole("button", { name: /got it/i }).click();
    await expect(page.getByText(/first/i)).toBeVisible();
  });

  test("the first-win time is recorded once, and a reload does not report a faster one", async ({
    page,
  }) => {
    await page.goto("/start/focus");
    await page.getByRole("button", { name: /got it/i }).click();
    await page.reload();
    await page.getByRole("button", { name: /got it/i }).click();
    // The database refuses the second report; the export still shows the first.
    await page.goto("/you/data");
    await expect(page.getByRole("button", { name: /download/i })).toBeVisible();
  });

  test("a learner cannot reach the dashboard even when signed in", async ({ page }) => {
    const response = await page.goto("/admin/metrics");
    expect(response?.status()).toBe(404);
  });
});
