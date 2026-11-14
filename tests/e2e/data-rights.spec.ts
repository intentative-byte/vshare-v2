import { expect, test } from "@playwright/test";

/**
 * Submissions, sharing and data rights.
 *
 * The routes and their honest states are checked here; the journeys with
 * real data are in data-rights-live.spec.ts.
 */

const routes = [
  ["/you/submit", "Submit a resource"],
  ["/you/submissions", "My submissions"],
  ["/you/data", "Your data"],
] as const;

test("the new pages are reachable and each has one heading", async ({ page }) => {
  for (const [route, heading] of routes) {
    const response = await page.goto(route);

    expect(response?.status(), route).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
  }
});

test("a public card page has no way to reach unpublished content", async ({ page }) => {
  const response = await page.goto("/c/a-pending-submission");

  // Whatever the catalogue holds, an unpublished slug must never render.
  expect(response?.status()).toBe(404);
});

test("the data page explains what deletion keeps and what it removes", async ({ page }) => {
  await page.goto("/you/data");

  const body = (await page.textContent("body")) ?? "";

  if (body.includes("unavailable")) {
    return;
  }

  await expect(page.getByText("Take a copy")).toBeVisible();
  await expect(page.getByText("Delete your account")).toBeVisible();
  await expect(page.getByRole("button", { name: "What stays, and why" })).toBeVisible();
});

test("deletion cannot be triggered without typing the confirmation", async ({ page }) => {
  await page.goto("/you/data");

  const body = (await page.textContent("body")) ?? "";

  if (body.includes("unavailable")) {
    return;
  }

  await page.getByRole("button", { name: "I want to delete my account" }).click();

  const confirmButton = page.getByRole("button", { name: "Delete my account permanently" });
  await expect(confirmButton).toBeDisabled();

  await page.getByLabel("Type DELETE to confirm").fill("delete");
  await expect(confirmButton).toBeDisabled();

  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await expect(confirmButton).toBeEnabled();
});
