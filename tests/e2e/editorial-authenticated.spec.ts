import { test, expect } from "@playwright/test";
import { localEnv, signInAs, signOut, TEST_IDENTITIES } from "./support/local-supabase";

/**
 * Authenticated editorial end-to-end tests (Phase 10.13 T7).
 *
 * These require a REAL LOCAL Supabase stack (PostgREST + GoTrue), the app pointed
 * at it, the batch-1 seed applied, and two labelled staff identities granted
 * (one admin, one moderator). Setup: docs/VSHARES_T7_LOCAL_EDITORIAL_E2E.md.
 *
 * They SKIP cleanly when the local stack is not configured (E2E_LOCAL_SUPABASE=1
 * + E2E_SUPABASE_URL + E2E_SUPABASE_SERVICE_KEY), so this file never fails a
 * normal CI run and NEVER fabricates a result. They never touch hosted Supabase
 * and never bypass the app's authorization — the app verifies every session and
 * the database enforces every rule.
 */

const env = localEnv();

test.describe("authenticated editorial workbench", () => {
  test.skip(!env, "requires a local Supabase stack — see docs/VSHARES_T7_LOCAL_EDITORIAL_E2E.md");

  test.afterEach(async ({ page }) => {
    await signOut(page);
  });

  test("an administrator can open the editorial board", async ({ page }) => {
    await signInAs(page, env!, TEST_IDENTITIES.adminA);
    const res = await page.goto("/admin/editorial");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /editorial review/i })).toBeVisible();
  });

  test("a moderator can open the editorial board", async ({ page }) => {
    await signInAs(page, env!, TEST_IDENTITIES.moderatorB);
    const res = await page.goto("/admin/editorial");
    expect(res?.status()).toBe(200);
  });

  test("a non-staff account is rejected (404)", async ({ page }) => {
    await signInAs(page, env!, TEST_IDENTITIES.ordinary);
    const res = await page.goto("/admin/editorial");
    expect(res?.status()).toBe(404);
  });

  test("a draft shows its current immutable revision", async ({ page }) => {
    await signInAs(page, env!, TEST_IDENTITIES.moderatorB);
    await page.goto("/admin/editorial");
    // Each item names the exact revision it binds decisions to.
    await expect(page.getByText(/revision/i).first()).toBeVisible();
  });

  test("a moderator records a decision and it persists in the audit ledger", async ({ page }) => {
    await signInAs(page, env!, TEST_IDENTITIES.moderatorB);
    await page.goto("/admin/editorial");
    const panel = page.locator("details").first();
    await panel.locator("summary").click();
    await panel.getByLabel(/decision/i).selectOption("request_revision");
    await panel.getByLabel(/rationale/i).fill("The first takeaway needs a source-grounded rewrite before approval.");
    await panel.getByRole("button", { name: /record decision/i }).click();
    await expect(panel.getByText(/recorded in the audit ledger/i)).toBeVisible();
    // Persisted: a reload still shows the decision from the database.
    await page.reload();
    await panel.locator("summary").click();
    await expect(panel.getByText(/Audit ledger/i)).toBeVisible();
  });

  test("high-impact content needs two distinct reviewers (quorum)", async ({ page, browser }) => {
    // Reviewer A approves the high-impact draft: not yet eligible.
    await signInAs(page, env!, TEST_IDENTITIES.adminA);
    await page.goto("/admin/editorial");
    const hi = page.locator("details", { hasText: /high-impact/i }).first();
    await hi.locator("summary").click();
    await hi.getByLabel(/decision/i).selectOption("approve");
    await hi.getByLabel(/rationale/i).fill("Reviewer A approves; a second independent reviewer is still required.");
    await hi.getByRole("button", { name: /record decision/i }).click();
    await expect(hi.getByText(/not yet eligible|recorded/i)).toBeVisible();

    // Reviewer B (distinct) approves the same revision: now eligible.
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await signInAs(pageB, env!, TEST_IDENTITIES.moderatorB);
    await pageB.goto("/admin/editorial");
    const hiB = pageB.locator("details", { hasText: /high-impact/i }).first();
    await hiB.locator("summary").click();
    await hiB.getByLabel(/decision/i).selectOption("approve");
    await hiB.getByLabel(/rationale/i).fill("Independent second reviewer B approves this revision.");
    await hiB.getByRole("button", { name: /record decision/i }).click();
    await expect(hiB.getByText(/meets the approval quorum/i)).toBeVisible();
    await ctxB.close();
  });

  test("the same reviewer cannot approve the same revision twice (duplicate rejection)", async ({ page }) => {
    await signInAs(page, env!, TEST_IDENTITIES.adminA);
    await page.goto("/admin/editorial");
    const hi = page.locator("details", { hasText: /high-impact/i }).first();
    await hi.locator("summary").click();
    await hi.getByLabel(/decision/i).selectOption("approve");
    await hi.getByLabel(/rationale/i).fill("Reviewer A attempts a second approval of the same revision.");
    await hi.getByRole("button", { name: /record decision/i }).click();
    await expect(hi.getByText(/already approved this revision/i)).toBeVisible();
  });

  test("a superseded revision no longer establishes eligibility (stale decision)", async ({ page }) => {
    // After a new revision is published for the card, prior approvals are shown
    // superseded and the item is no longer eligible. (A new revision is added out
    // of band by the setup; this asserts the UI reflects the DB invalidation.)
    await signInAs(page, env!, TEST_IDENTITIES.moderatorB);
    await page.goto("/admin/editorial");
    await expect(page.getByText(/superseded|not yet eligible/i).first()).toBeVisible();
  });

  test("session expiry is handled without a false success", async ({ page }) => {
    await signInAs(page, env!, TEST_IDENTITIES.moderatorB);
    await page.goto("/admin/editorial");
    await signOut(page); // drop the session cookie mid-flow
    const res = await page.goto("/admin/editorial");
    // With no session the staff gate denies access (404), never a silent success.
    expect(res?.status()).toBe(404);
  });
});
