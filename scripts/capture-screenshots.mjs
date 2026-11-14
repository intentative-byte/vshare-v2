// Captures a screenshot of every main route at phone and desktop width, as
// visual evidence for a milestone report.
//
// Usage:
//   npx next start -p 3102 &
//   BASE_URL=http://127.0.0.1:3102 OUT_DIR=docs/evidence/milestone-1 \
//     node scripts/capture-screenshots.mjs
//
// PLAYWRIGHT_CHROMIUM_PATH may point at a preinstalled browser.
import { mkdir } from "node:fs/promises";
import { chromium, devices } from "@playwright/test";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outDir = process.env.OUT_DIR ?? "screenshots";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

const routes = [
  ["home", "/"],
  ["explore", "/explore"],
  ["explore-personal-finance", "/explore/personal-finance"],
  ["learn", "/learn"],
  ["path", "/path"],
  ["saved", "/saved"],
  ["you", "/you"],
  ["component-gallery", "/dev/ui"],
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch(executablePath ? { executablePath } : {});
let failures = 0;

for (const [name, route] of routes) {
  for (const [label, contextOptions] of [
    ["mobile", { ...devices["Pixel 7"] }],
    ["desktop", { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 }],
  ]) {
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    try {
      const response = await page.goto(baseUrl + route, { waitUntil: "networkidle" });
      const status = response?.status() ?? 0;

      await page.screenshot({ path: `${outDir}/${name}-${label}.png`, fullPage: true });
      console.log(`${status} ${label.padEnd(7)} ${route}`);

      if (status >= 400) {
        failures += 1;
      }
    } catch (error) {
      failures += 1;
      console.error(`FAILED ${label} ${route}: ${error.message}`);
    } finally {
      await context.close();
    }
  }
}

await browser.close();
process.exit(failures > 0 ? 1 : 0);
