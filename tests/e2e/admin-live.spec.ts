import { expect, test } from "@playwright/test";

/**
 * The admin catalogue and taxonomy interface, driven as an administrator.
 *
 * Needs an auth service and a staff account, so these are skipped with the
 * reason stated rather than replaced by something weaker. The database layer
 * is covered by supabase/tests/cases/230_admin_access.sql, which runs.
 *
 * docs/VSHARES_LIVE_VERIFICATION.md lists what clearing these requires.
 */

const reason = "needs an auth service and an administrator account";

test.describe("admin interface", () => {
  test.skip(true, reason);

  test("an admin can create a category and it appears in the list", async ({ page }) => {
    await page.goto("/admin/taxonomy");
    await page.getByRole("button", { name: "New category" }).click();
    await page.getByLabel("Name").fill("Productivity");
    await page.getByLabel("Slug").fill("productivity");
    await page.getByLabel("Description").fill("Getting what matters done, without theatre.");
    await page.getByRole("button", { name: "Create category" }).click();
    await expect(page.getByText("Productivity")).toBeVisible();
  });

  test("a new card enters as a draft and cannot be published without a link check", async ({
    page,
  }) => {
    await page.goto("/admin/cards/new");
    await page.getByLabel("Title").fill("A curated resource");
    await page.getByLabel("Slug").fill("a-curated-resource");
    await page.getByLabel("Source link").fill("https://example.com/resource");
    await page.getByLabel("Publisher").fill("Example Publisher");
    await page.getByLabel("Summary").fill("A summary that is past the forty character minimum here.");
    await page.getByLabel("Takeaways").fill("Something worth taking away from it.");
    await page.getByLabel("Next step").fill("Do the thing it suggests.");
    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page.getByText("draft")).toBeVisible();
    await expect(page.getByText("cannot be published until its source link has been checked")).toBeVisible();
  });

  test("a moderator does not see taxonomy management working", async ({ page }) => {
    // A moderator can reach the area but the database refuses taxonomy writes.
    await page.goto("/admin/taxonomy");
    await page.getByRole("button", { name: "New category" }).click();
    await page.getByLabel("Name").fill("Should not work");
    await page.getByLabel("Slug").fill("should-not-work");
    await page.getByLabel("Description").fill("A moderator should not be able to create this.");
    await page.getByRole("button", { name: "Create category" }).click();
    await expect(page.getByText(/not available|administrator|could not/i)).toBeVisible();
  });

  test("the audit log lists recorded actions for an admin", async ({ page }) => {
    await page.goto("/admin/audit");
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("a card's version history keeps every version", async ({ page }) => {
    await page.goto("/admin/cards/11111111-2222-4333-8444-555555555555");
    await page.getByRole("button", { name: "New version" }).click();
    await expect(page.getByText("A correction is a new version")).toBeVisible();
  });
});
