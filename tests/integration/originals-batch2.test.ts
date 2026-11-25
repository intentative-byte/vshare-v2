import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { prepareBatch2, BATCH2_CANDIDATES, EXISTING_CATALOGUE } from "@/factory";

/**
 * Batch-2 Originals generation (Phase 10.13 T3).
 *
 * Asserts the HONESTY invariants, then writes the candidate report so the owner
 * can inspect it. Nothing here is verified, approved or published.
 */
describe("prepareBatch2", () => {
  const report = prepareBatch2();

  it("reports every candidate", () => {
    expect(report.total).toBe(BATCH2_CANDIDATES.length);
    expect(report.candidates).toHaveLength(BATCH2_CANDIDATES.length);
  });

  it("marks NOTHING as verified (no supporting quotes were supplied)", () => {
    expect(report.summary.verified).toBe(0);
    for (const c of report.candidates) {
      expect(c.evidenceStatus).not.toBe("verified");
    }
  });

  it("applies the quality gate to every candidate", () => {
    for (const c of report.candidates) {
      expect(["reject", "revise", "queue"]).toContain(c.qualityVerdict);
      expect(c.qualityComposite).toBeGreaterThanOrEqual(0);
      expect(c.qualityComposite).toBeLessThanOrEqual(100);
    }
  });

  it("does not reuse any existing seed source URL (no exact duplicates)", () => {
    expect(report.summary.exactDuplicates).toBe(0);
  });

  it("classifies every candidate against the existing catalogue", () => {
    for (const c of report.candidates) {
      expect(["unique", "exact_duplicate", "near_duplicate_review"]).toContain(c.duplicate.verdict);
    }
  });

  it("flags high-impact candidates (personal-finance) as such", () => {
    const finance = report.candidates.filter((c) => c.category === "personal-finance");
    expect(finance.length).toBeGreaterThan(0);
    for (const c of finance) expect(c.isHighImpact).toBe(true);
  });

  it("never carries a publication status on a candidate", () => {
    for (const c of report.candidates) {
      const keys = Object.keys(c);
      for (const forbidden of ["published", "publishedAt", "status", "approved"]) {
        expect(keys).not.toContain(forbidden);
      }
    }
  });

  it("detects an exact duplicate when a candidate reuses a seed URL (control)", () => {
    const seeded = EXISTING_CATALOGUE[0]!;
    const base = BATCH2_CANDIDATES[0]!;
    const r = prepareBatch2([{ ...base, source: { ...base.source, url: seeded.url } }], EXISTING_CATALOGUE);
    expect(r.summary.exactDuplicates).toBe(1);
    expect(r.candidates[0]?.bridgeReady).toBe(false);
  });

  it("writes the candidate report artifact for owner inspection", () => {
    const dir = resolve(process.cwd(), "docs/samples");
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, "originals-batch-2-candidates.json"), JSON.stringify(report, null, 2) + "\n");
    expect(report.candidates.length).toBeGreaterThan(0);
  });
});
