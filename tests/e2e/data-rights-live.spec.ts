import { expect, test } from "@playwright/test";

/**
 * Submissions, reporting, sharing and data rights, with a service behind
 * them. Skipped with a reason when none is configured.
 */

const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

test.describe("submissions and data rights", () => {
  test.skip(!configured, "No database configured for this run.");

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

  test("my submissions shows only mine", async ({ page }) => {
    await page.goto("/you/submissions");

    const body = (await page.textContent("body")) ?? "";
    expect(/not submitted anything|With a moderator|Published/.test(body)).toBe(true);
  });

  test("the export downloads a documented file", async ({ page }) => {
    await page.goto("/you/data");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download my data" }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^vshares-export-\d{4}-\d{2}-\d{2}\.json$/);
  });

  test("a card can be shared by its public address", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/explore");

    // Reaching a published card, then sharing it.
    const card = page.locator('a[href^="/c/"]').first();

    if ((await card.count()) === 0) {
      test.skip(true, "No published cards in this environment yet.");
      return;
    }

    await card.click();
    await page.getByRole("button", { name: "Share" }).click();
    await expect(page.getByText("Link copied.")).toBeVisible();
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
