import { expect, test } from "@playwright/test";

test("responses carry the security headers", async ({ page }) => {
  const response = await page.goto("/");
  const headers = response?.headers() ?? {};

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
  expect(headers["strict-transport-security"]).toContain("max-age=");
  expect(headers["permissions-policy"]).toContain("camera=()");

  // The framework's version banner is not advertised.
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("the content security policy is strict and nonce-based", async ({ page }) => {
  const response = await page.goto("/");
  const policy = response?.headers()["content-security-policy"];

  expect(policy, "a policy must be present").toBeTruthy();

  const directives = policy ?? "";

  expect(directives).toContain("default-src 'self'");
  expect(directives).toContain("object-src 'none'");
  expect(directives).toContain("frame-ancestors 'none'");
  expect(directives).toContain("base-uri 'none'");
  expect(directives).toContain("form-action 'self'");
  expect(directives).toMatch(/script-src [^;]*'nonce-/);

  // Scripts must never be allowed inline without a nonce.
  const scriptSrc = directives.split(";").find((part) => part.trim().startsWith("script-src")) ?? "";
  expect(scriptSrc).not.toContain("'unsafe-inline'");
});

test("each response gets its own nonce", async ({ page }) => {
  const first = await page.goto("/");
  const second = await page.goto("/learn");

  const nonceOf = (policy: string | undefined) => /'nonce-([^']+)'/.exec(policy ?? "")?.[1];

  const firstNonce = nonceOf(first?.headers()["content-security-policy"]);
  const secondNonce = nonceOf(second?.headers()["content-security-policy"]);

  expect(firstNonce).toBeTruthy();
  expect(secondNonce).toBeTruthy();
  expect(firstNonce).not.toBe(secondNonce);
});

test("the development component gallery is not reachable in production", async ({ request }) => {
  const response = await request.get("/dev/ui");

  // The build under test runs with NODE_ENV=production, so this route is gone.
  expect(response.status()).toBe(404);
});

test("the development multimedia prototype is not reachable in production", async ({ request }) => {
  // Approved-only governance: the multimedia prototype renders fixtures and must
  // never be a public route. In a production build it answers 404.
  const response = await request.get("/dev/media");
  expect(response.status()).toBe(404);
});

test("editorial review material is not reachable without authorisation", async ({ request }) => {
  // Reviewer-only: /admin/editorial is gated server-side by the admin layout
  // (staff role, and 404 when no database is configured); /dev/editorial is the
  // dev-only preview, gone in production. An ordinary/unauthenticated request
  // must reach neither.
  expect((await request.get("/admin/editorial")).status()).toBe(404);
  expect((await request.get("/dev/editorial")).status()).toBe(404);
  // The authenticated-workbench accessibility preview is also dev-only.
  expect((await request.get("/dev/editorial-auth")).status()).toBe(404);
});
