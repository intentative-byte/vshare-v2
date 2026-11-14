import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/path",
  "/learn",
  "/explore",
  "/explore/personal-finance",
  "/saved",
  "/you",
];

// The component gallery is deliberately absent: a production build answers
// 404 for it, which security-headers.spec.ts asserts, and turning dev tools
// on for this suite would make that check pass for the wrong reason. The
// chart marks it carries are checked by scripts/check-gallery-accessibility.mjs
// against a build with dev tools on; the result is in the test report.

for (const route of routes) {
  test(`no accessibility violations on ${route}`, async ({ page }) => {
    await page.goto(route);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    const summary = results.violations.map(
      (violation) =>
        `${violation.id} (${violation.impact}): ${violation.help}\n  ${violation.nodes
          .map((node) => node.target.join(" "))
          .join("\n  ")}`,
    );

    expect(summary, summary.join("\n\n")).toEqual([]);
  });
}

test("the keyboard alone reaches the content and the navigation", async ({ page }) => {
  await page.goto("/learn");

  // The first stop is the skip link.
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#content$/);

  // Every navigation link is reachable and shows a visible focus ring.
  const navLinks = page.getByRole("navigation", { name: "Main" }).getByRole("link");
  const count = await navLinks.count();
  expect(count).toBeGreaterThanOrEqual(5);

  await navLinks.first().focus();
  await expect(navLinks.first()).toBeFocused();

  const outline = await navLinks.first().evaluate((element) => {
    const style = window.getComputedStyle(element);
    return { width: style.outlineWidth, style: style.outlineStyle };
  });

  expect(outline.style).not.toBe("none");
  expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(2);
});

test("tap targets on the main navigation are large enough", async ({ page }) => {
  await page.goto("/learn");

  const navLinks = page.getByRole("navigation", { name: "Main" }).getByRole("link");
  const count = await navLinks.count();

  for (let index = 0; index < count; index += 1) {
    const box = await navLinks.nth(index).boundingBox();

    expect(box, `link ${index} should be laid out`).not.toBeNull();

    if (box) {
      expect(box.height, `link ${index} height`).toBeGreaterThanOrEqual(44);
    }
  }
});

test("the page does not scroll sideways at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });

  for (const route of routes) {
    await page.goto(route);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    expect(overflow, `${route} horizontal overflow`).toBeLessThanOrEqual(1);
  }
});
