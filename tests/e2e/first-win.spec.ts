import { expect, test } from "@playwright/test";

/**
 * The first learning win.
 *
 * The journey from the home page to a topic is real without a database:
 * only the card itself needs one. These check the parts that always work
 * and that the rest is honest about its state; the full journey with
 * content is in first-win-live.spec.ts.
 */

test("the home page offers topics and promises no sign-up", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText(/No account, no sign-up/i)).toBeVisible();

  const chip = page.getByRole("link", { name: /Budgeting/ });
  await expect(chip).toBeVisible();
  await expect(chip).toHaveAttribute("href", "/start/budgeting");
});

test("choosing a topic leads straight to a learning page, not a sign-up wall", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Budgeting/ }).click();

  await expect(page).toHaveURL(/\/start\/budgeting$/);

  // Whatever the state of the catalogue, this must never be a sign-in form.
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Email me a link/ })).toHaveCount(0);

  const body = (await page.textContent("body")) ?? "";
  expect(/not available here|Got it|Nothing published/i.test(body)).toBe(true);
});

test("an unknown topic is not found rather than guessed at", async ({ page }) => {
  const response = await page.goto("/start/not-a-real-topic");

  expect([404, 200]).toContain(response?.status() ?? 0);

  if (response?.status() === 200) {
    const body = (await page.textContent("body")) ?? "";
    expect(/not available here/i.test(body)).toBe(true);
  }
});

test("the saved and path tabs are reachable and honest", async ({ page }) => {
  for (const [route, heading] of [
    ["/saved", "Your knowledge library"],
    ["/path", "Your next step"],
  ]) {
    const response = await page.goto(route!);
    expect(response?.status(), route).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(heading!);
  }
});
