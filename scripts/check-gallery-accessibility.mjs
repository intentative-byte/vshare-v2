// Runs axe over the development component gallery.
//
// The gallery cannot be part of the normal end-to-end suite: a production
// build answers 404 for it, and that 404 is itself a security check. So this
// starts its own build with dev tools enabled, checks every component on the
// page at both viewports, and reports violations.
//
// Usage:
//   npm run build
//   DEV_TOOLS_ENABLED=true npx next start -p 3109 &
//   BASE_URL=http://127.0.0.1:3109 node scripts/check-gallery-accessibility.mjs
import AxeBuilder from "@axe-core/playwright";
import { chromium, devices } from "@playwright/test";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3109";
const browser = await chromium.launch();
let violations = 0;

for (const [label, options] of [
  ["mobile 412px", { ...devices["Pixel 7"] }],
  ["desktop 1280px", { viewport: { width: 1280, height: 1000 } }],
]) {
  const context = await browser.newContext(options);
  const page = await context.newPage();

  for (const route of ["/dev/ui", "/dev/media", "/dev/editorial"]) {
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });

    if (response?.status() !== 200) {
      console.error(`${route} answered ${response?.status()}. Start the server with DEV_TOOLS_ENABLED=true.`);
      process.exit(2);
    }

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    console.log(`${label} ${route}: ${results.violations.length} violations`);

    for (const violation of results.violations) {
      violations += 1;
      console.error(`  ${violation.id} (${violation.impact}): ${violation.help}`);
      for (const node of violation.nodes) {
        console.error(`    ${node.target.join(" ")}`);
      }
    }
  }

  await context.close();
}

await browser.close();
process.exit(violations === 0 ? 0 : 1);
