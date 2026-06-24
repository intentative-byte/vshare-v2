import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

const routes = [
  ["homepage", "app/page.tsx", "FeedExperience"],
  ["login", "app/login/page.tsx", "AuthForm"],
  ["onboarding", "app/onboarding/page.tsx", "OnboardingForm"],
  ["feed", "app/feed/page.tsx", "FeedExperience"],
  ["explore", "app/explore/page.tsx", "ExploreExperience"],
  ["saved", "app/saved/page.tsx", "SavedExperience"],
  ["profile", "app/profile/page.tsx", "ProfileDashboard"],
];

test("core routes render their product experiences", () => {
  for (const [name, path, marker] of routes) {
    assert.equal(existsSync(join(root, path)), true, `${name} route should exist`);
    assert.match(read(path), new RegExp(marker), `${name} route should reference ${marker}`);
  }
});

test("local demo mode remains available without Supabase", () => {
  assert.match(read("lib/supabase/env.ts"), /isSupabaseConfigured/);
  assert.match(read("lib/supabase/client.ts"), /return null/);
  assert.match(read("lib/supabase/server.ts"), /return null/);
  assert.match(read("components/AuthForm.tsx"), /stored on this device/);
  assert.match(read("components/AuthForm.tsx"), /Continue in demo mode/);
});

test("health endpoint reports app status and local mode", () => {
  const healthRoute = read("app/api/health/route.ts");
  assert.match(healthRoute, /status: "ok"/);
  assert.match(healthRoute, /isSupabaseConfigured/);
});

test("VAI orchestration exposes a unified user state", () => {
  const orchestrator = read("lib/vai/orchestrator.ts");
  assert.match(orchestrator, /getUnifiedUserState/);
  assert.match(orchestrator, /getVaiOrchestration/);
  assert.match(read("lib/learning/index.ts"), /vai,?/);
});

test("first-user test plan is documented", () => {
  const plan = read("docs/first-user-test-plan.md");
  assert.match(plan, /Continue in demo mode/);
  assert.match(plan, /Save one item/);
  assert.match(plan, /Success criteria/);
});
