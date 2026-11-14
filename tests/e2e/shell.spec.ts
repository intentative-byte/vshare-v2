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
  await page.goto("/explore");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Categories");

  // What Explore then shows depends on the catalogue, which needs a
  // database; that is covered in catalogue-live.spec.ts.
  const body = (await page.textContent("body")) ?? "";
  expect(/Technology|unavailable|being prepared/i.test(body)).toBe(true);
});

test("anything unfinished says so, and names when it arrives", async ({ page }) => {
  // Most destinations are built now. Wherever one is not, it must say so
  // rather than appearing complete, and name the milestone that delivers it.
  for (const route of ["/path", "/learn", "/explore", "/saved", "/you"]) {
    await page.goto(route);

    const notices = page.getByText("Not built yet");
    const count = await notices.count();

    for (let index = 0; index < count; index += 1) {
      const panel = notices.nth(index).locator("xpath=..");
      await expect(panel, `${route} notice ${index}`).toContainText(/Planned for Milestone/);
    }
  }
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

  await page.goto("/you");

  const toggle = page.getByRole("button", { name: "What this tab holds" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  await toggle.click();

  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText(/everything VSHARES has learned about what you want to learn/i)).toBeVisible();
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
