import { expect, test } from "@playwright/test";

const destinations = [
  { path: "/path", heading: "Your next step" },
  { path: "/learn", heading: "Your value feed" },
  { path: "/explore", heading: "Categories" },
  { path: "/saved", heading: "Your knowledge library" },
  { path: "/you", heading: "Your account" },
];

test("home page states the promise and offers a way in", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Stop doomscrolling");
  await expect(page.getByRole("link", { name: "Start learning" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What do you want to get better at?" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Budgeting/ })).toBeVisible();
});

test("every navigation destination has a working route", async ({ page }) => {
  for (const destination of destinations) {
    const response = await page.goto(destination.path);

    expect(response?.status(), destination.path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(destination.heading);
  }
});

test("navigation marks the current destination", async ({ page }) => {
  await page.goto("/learn");

  const current = page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /Learn/ });

  await expect(current.first()).toHaveAttribute("aria-current", "page");
});

test("a visitor can walk from the home page into a category", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Budgeting/ }).click();

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Personal Finance");
  // A high-impact category carries its notice.
  await expect(page.getByText("Educational, not advice.")).toBeVisible();
  await expect(page.getByText("Debt and credit")).toBeVisible();
});

test("unfinished destinations say so rather than looking complete", async ({ page }) => {
  await page.goto("/learn");

  await expect(page.getByText("Not built yet")).toBeVisible();
  await expect(page.getByText(/Planned for Milestone/)).toBeVisible();
});

test("an unknown page returns 404 with a way back", async ({ page }) => {
  const response = await page.goto("/no-such-page");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("could not find");
});

test("the client layer hydrates under the content security policy", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/path");

  const toggle = page.getByRole("button", { name: "What it will be based on" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  await toggle.click();

  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText(/Topics you choose, what you have finished/)).toBeVisible();
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("health and readiness endpoints answer without leaking configuration", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ status: "ok" });

  const ready = await request.get("/api/ready");
  expect([200, 503]).toContain(ready.status());

  const body = await ready.json();
  expect(Object.keys(body)).toEqual(["status"]);
  expect(JSON.stringify(body)).not.toMatch(/supabase|SUPABASE|localhost:543/);
});
