import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const appDir = join(root, "app");
const componentsDir = join(root, "components");

const forbiddenPatterns = [
  /rebuilt in this repository/i,
  /Supabase-backed/i,
  /API routes keep/i,
  /Explore demo feed/i,
  /Configure Supabase/i,
  /stored in Supabase/i,
  /VShare v2 is rebuilt/i,
];

const requiredHomepagePatterns = [
  /Turn scrolling into growth\./,
  /Choose what you want to learn\. VShare builds a feed that helps you improve every day\./,
  /Start learning/,
  /Explore feed/,
  /Personal learning feed/,
  /Your feed adapts to your interests, goals, and saved resources\./,
  /Learning paths/,
  /Follow simple paths that help you build skills step by step\./,
  /Daily growth loop/,
  /Complete small daily missions and keep your progress moving\./,
];

const requiredAuthPatterns = [/Continue in demo mode/];

function collectTsxFiles(dir) {
  const files = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...collectTsxFiles(fullPath));
      continue;
    }

    if (fullPath.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }

  return files;
}

function relative(path) {
  return path.replace(`${root}/`, "");
}

const publicFiles = [...collectTsxFiles(appDir), ...collectTsxFiles(componentsDir)];
const homepage = readFileSync(join(appDir, "page.tsx"), "utf8");
const authForm = readFileSync(join(componentsDir, "AuthForm.tsx"), "utf8");

let failed = false;

for (const file of publicFiles) {
  const content = readFileSync(file, "utf8");

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      console.error(`FAIL: ${relative(file)} contains forbidden copy matching ${pattern}`);
      failed = true;
    }
  }
}

for (const pattern of requiredHomepagePatterns) {
  if (!pattern.test(homepage)) {
    console.error(`FAIL: homepage missing required copy matching ${pattern}`);
    failed = true;
  }
}

for (const pattern of requiredAuthPatterns) {
  if (!pattern.test(authForm)) {
    console.error(`FAIL: AuthForm missing required copy matching ${pattern}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Smoke test passed for ${publicFiles.length} public UI files.`);
