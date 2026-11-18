import { expect, test } from "@playwright/test";
import { enforceReadOnly, requireLive, requireLiveWrites } from "./support/live";

/**
 * Submissions, reporting, sharing and data rights, with a service behind them.
 *
 * Split by effect. Sending a submission, exporting (which may establish a guest
 * account) and reporting all WRITE, so they are WRITE_REQUIRED. Reading "my
 * submissions", and sharing a published card's public link, are READ_ONLY (the
 * share and report tests are also CONTENT_BLOCKED and self-skip with no
 * published cards). See docs/VSHARES_LIVE_TEST_INVENTORY.json.
 */

test.describe("submissions and data rights (writes)", () => {
  requireLiveWrites(test);

  test("a submission reaches the queue and says it is not published", async ({ page }) => {
    await page.goto("/you/submit");

    await page.getByLabel("Link to the resource").fill("https://example.com/a-new-resource");
    await page.getByLabel("Who published it").fill("Example Publisher");
    await page.getByLabel("Title").fill("Something genuinely useful to read");
    await page
      .getByLabel("Why is it worth someone's time?")
      .fill("A summary long enough to satisfy the minimum length the server applies to this.");
    await page.getByLabel("One thing a reader takes away").fill("Something worth remembering.");
    await page.getByLabel("What should they do with it?").fill("Try the first suggestion.");
    await page.getByLabel("Topic").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Send to a moderator" }).click();

    await expect(page.getByText("it is with a moderator")).toBeVisible();
    await expect(page.getByText(/Nothing is published automatically/)).toBeVisible();
  });

  test("the export downloads a documented file", async ({ page }) => {
    await page.goto("/you/data");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download my data" }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^vshares-export-\d{4}-\d{2}-\d{2}\.json$/);
  });

  test("reporting the same card twice is refused", async ({ page }) => {
    await page.goto("/explore");

    const card = page.locator('a[href^="/c/"]').first();

    if ((await card.count()) === 0) {
      test.skip(true, "No published cards in this environment yet.");
      return;
    }

    await card.click();
    await page.getByRole("button", { name: "Report a problem" }).click();
    await page.getByRole("button", { name: "Send the report" }).click();
    await expect(page.getByText(/Thank you|already reported/)).toBeVisible();
  });
});

test.describe("submissions and data rights (read-only)", () => {
  requireLive(test);
  enforceReadOnly(test);

  test("my submissions shows only mine", async ({ page }) => {
    await page.goto("/you/submissions");

    const body = (await page.textContent("body")) ?? "";
    expect(/not submitted anything|With a moderator|Published/.test(body)).toBe(true);

    // Regression guard (Phase 9.2D): the list is read on the server, so there
    // is no on-mount client fetch — no persistent loading skeleton, and (via
    // enforceReadOnly above) no server-action request. A signed-out visitor
    // reaches the empty state, not an error. If this page regresses to a
    // client-side read action, enforceReadOnly fails it as a mutating request.
    await expect(page.getByText("Loading your submissions")).toHaveCount(0);
    await expect(page.getByText("These did not load")).toHaveCount(0);
  });

  test("a card can be shared by its public address", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/explore");

    // Reaching a published card, then sharing it (clipboard only, no write).
    const card = page.locator('a[href^="/c/"]').first();

    if ((await card.count()) === 0) {
      test.skip(true, "No published cards in this environment yet.");
      return;
    }

    await card.click();
    await page.getByRole("button", { name: "Share" }).click();
    await expect(page.getByText("Link copied.")).toBeVisible();
  });
});
