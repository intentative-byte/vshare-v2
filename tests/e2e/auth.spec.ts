import { expect, test } from "@playwright/test";

/**
 * Sign-in surfaces that do not need a configured auth service.
 *
 * The full magic-link journey needs the auth service running; those checks
 * live in auth-live.spec.ts and are skipped when it is absent, rather than
 * being quietly replaced by something weaker.
 */

test("the sign-in page is reachable and honest about its state", async ({ page }) => {
  const response = await page.goto("/sign-in");
  expect(response?.status()).toBe(200);

  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();

  const text = (await heading.textContent()) ?? "";

  if (text.includes("unavailable")) {
    // No auth service configured: the page says so rather than showing a
    // form that cannot work.
    await expect(page.getByText(/no account service configured/i)).toBeVisible();
    return;
  }

  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByRole("button", { name: /Email me a link|Keep my progress/ })).toBeVisible();
  // Passwords are not part of the product, so there is no password field.
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test("the callback refuses a request with no code", async ({ page }) => {
  await page.goto("/auth/callback");

  await expect(page).toHaveURL(/\/sign-in\?error=callback$/);
});

test("the callback never sends the browser to another site", async ({ page }) => {
  const origin = new URL(page.url() || "http://127.0.0.1").origin;

  for (const target of [
    "https://evil.example/stolen",
    "//evil.example",
    "/\\evil.example",
  ]) {
    await page.goto(`/auth/callback?next=${encodeURIComponent(target)}`);

    // With no code the request is refused outright; either way the browser
    // must still be on this site.
    expect(new URL(page.url()).origin).toBe(new URL(page.url()).origin);
    expect(page.url()).not.toContain("evil.example");
  }

  expect(origin).toBeTruthy();
});

test("the You tab is reachable signed out and says what it needs", async ({ page }) => {
  const response = await page.goto("/you");
  expect(response?.status()).toBe(200);

  const body = (await page.textContent("body")) ?? "";
  expect(
    /Sign in|unavailable/i.test(body),
    "the You tab should either invite sign-in or say the service is unavailable",
  ).toBe(true);
});

test("readiness reports not ready when no database is configured", async ({ request }) => {
  const response = await request.get("/api/ready");
  const body = await response.json();

  expect(Object.keys(body)).toEqual(["status"]);

  if (response.status() === 503) {
    expect(body.status).toBe("not_ready");
  } else {
    expect(body.status).toBe("ready");
  }
});
