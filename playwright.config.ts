import { defineConfig, devices } from "@playwright/test";

/**
 * Make .env.local visible to the TEST RUNNER, as Next.js already makes it
 * visible to the app under test. Without this the live-test skip guards, which
 * read process.env in the runner, never see the Supabase URL/key even when
 * .env.local has them (the cause of the "72 always skip" behaviour).
 *
 * process.loadEnvFile is a built-in on Node 20.12+/22 (this project runs 22),
 * so no dependency is added. It does NOT override variables already set in the
 * environment, so a shell `export` still wins. A missing or unreadable file is
 * ignored, so a checkout without .env.local still runs the non-live suite.
 * Values are loaded into process.env only; nothing is printed.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local (e.g. CI) — the non-live suite runs; live tests skip.
}

const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${port}`;

/**
 * End-to-end and accessibility checks against a production build, so the
 * Content-Security-Policy and security headers under test are the real ones.
 *
 * PLAYWRIGHT_CHROMIUM_PATH lets a machine with a preinstalled browser use it;
 * continuous integration installs its own and leaves the variable unset.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 30_000,
  use: {
    baseURL,
    trace: "off",
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [
    {
      // The product is mobile-first, so this viewport comes first.
      name: "mobile",
      use: { ...devices["Pixel 7"], ...(executablePath ? { launchOptions: { executablePath } } : {}) },
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
      },
    },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${port}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
