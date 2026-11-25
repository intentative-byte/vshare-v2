import { expect, test } from "@playwright/test";

/**
 * Measurement, from the outside.
 *
 * What can be checked without a service: that the dashboard is not
 * reachable without a role, that the page never leaks a figure into the
 * markup when it has no data, and that nothing on a learner's path writes
 * an identifier before consent. The dashboard with real data is in
 * analytics-live.spec.ts.
 */

test("the admin dashboard is not reachable without a role", async ({ page }) => {
  const response = await page.goto("/admin/metrics");

  // 404 rather than 403: an account with no business there learns nothing
  // about what exists.
  expect(response?.status()).toBe(404);
});

test("no analytics identifier is set in the browser before consent", async ({ page, context }) => {
  // Walk a normal path through the product, not just one page.
  for (const route of ["/", "/explore", "/learn"]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
  }

  const cookies = await context.cookies();
  const analytics = cookies.filter((cookie) => /analytic|track|_ga|mixpanel|posthog|amplitude/i.test(cookie.name));

  expect(analytics, `unexpected cookies: ${analytics.map((c) => c.name).join(", ")}`).toHaveLength(0);

  const stored = await page.evaluate(() => {
    const keys: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key) keys.push(key);
      }
    } catch {
      // A browser that refuses storage is fine; there is nothing to find.
    }
    return keys;
  });

  expect(stored.filter((key) => /analytic|track|visitor|device/i.test(key))).toHaveLength(0);
});

test("no third-party analytics or advertising script is loaded", async ({ page }) => {
  const external: string[] = [];

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
      external.push(url.hostname);
    }
  });

  for (const route of ["/", "/explore", "/learn", "/you"]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
  }

  expect(external, `third-party requests: ${[...new Set(external)].join(", ")}`).toHaveLength(0);
});
