import { expect, test } from "@playwright/test";

/**
 * The admin area, from the outside.
 *
 * Every admin route must answer 404 to an account without a role — 404
 * rather than 403, so an account with no business there learns nothing about
 * what exists (D-045). The authenticated journeys (an admin actually
 * managing taxonomy and cards) are in admin-live.spec.ts, skipped for want
 * of a service.
 */

const adminRoutes = [
  "/admin",
  "/admin/queue",
  "/admin/taxonomy",
  "/admin/cards/new",
  "/admin/cards/11111111-2222-4333-8444-555555555555",
  "/admin/metrics",
  "/admin/audit",
];

test("every admin route is 404 without a role", async ({ page }) => {
  for (const route of adminRoutes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(404);
  }
});
