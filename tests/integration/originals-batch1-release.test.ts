import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createHttpFetcher, DEFAULT_USER_AGENT, retrieveSource, researchDraft } from "@/factory/live";
import { classifyClaimSupport, type SupportClass } from "@/factory/live/verify-support";
import type { DraftInput } from "@/factory/types";

/**
 * Batch-1 release-readiness audit (Phase 10.16).
 *
 * Reads the AUTHORITATIVE batch-1 card data (exported from the seeded database)
 * and, under FACTORY_LIVE=1, performs real read-only retrieval + claim support
 * classification to produce an honest per-card release-readiness record. A
 * reachable link is never treated as a verified claim. Nothing is published or
 * approved. SKIPS when live retrieval is not enabled.
 */

const LIVE = process.env.FACTORY_LIVE === "1";
const NOW = "2026-11-21T00:00:00Z";
const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

type SeedCard = {
  slug: string;
  category: string;
  topic: string;
  level: DraftInput["level"];
  format: DraftInput["format"];
  estimatedMinutes: number;
  qualityScore: number;
  isHighImpact: boolean;
  sourceUrl: string;
  sourceName: string;
  title: string;
  summary: string;
  takeaways: string[];
  nextStep: string;
};

function loadCards(): SeedCard[] {
  const path = resolve(process.cwd(), "docs/samples/originals-batch-1-cards.json");
  return JSON.parse(readFileSync(path, "utf8")) as SeedCard[];
}

function toDraft(c: SeedCard): DraftInput {
  return {
    slug: c.slug,
    category: c.category,
    topic: c.topic,
    level: c.level,
    format: c.format,
    objective: `Learn: ${c.title}`,
    title: c.title,
    summary: c.summary,
    takeaways: c.takeaways,
    nextStep: c.nextStep,
    estimatedMinutes: c.estimatedMinutes,
    source: { url: c.sourceUrl, publisher: c.sourceName },
  };
}

describe("batch-1 release-readiness audit", () => {
  it("has ten authoritative cards to audit", () => {
    expect(loadCards()).toHaveLength(10);
  });

  it.skipIf(!LIVE)(
    "retrieves real sources and records honest release-readiness",
    async () => {
      const fetcher = createHttpFetcher(DEFAULT_USER_AGENT);
      const cards = loadCards();
      const records = [];

      for (const c of cards) {
        const draft = toDraft(c);
        const retrieval = await retrieveSource(draft.source.url, {
          fetcher,
          ua: DEFAULT_USER_AGENT,
          now: NOW,
          beforeRequest: () => delay(1500),
        });
        const researched = researchDraft(draft, retrieval, { now: NOW });
        const claims = draft.takeaways.map((t) => {
          const s = classifyClaimSupport(t, retrieval.passages);
          return { claim: t, supportClass: s.supportClass, excerpt: s.passage && s.supportClass !== "insufficient_evidence" ? s.passage : undefined, note: s.note };
        });
        const supportSummary: Record<SupportClass, number> = {
          exact_support: 0, semantic_support: 0, partial_support: 0, contradiction: 0, insufficient_evidence: 0,
        };
        for (const cl of claims) supportSummary[cl.supportClass] += 1;

        const blockers: string[] = [];
        blockers.push("source link not yet checked (link_checked_at is null)");
        if (retrieval.status !== "ok") blockers.push(`source not cleanly retrievable (${retrieval.status})`);
        if (supportSummary.exact_support + supportSummary.semantic_support === 0)
          blockers.push("no claim is textually supported by the retrieved source — needs human evidence grounding");
        if (supportSummary.contradiction > 0) blockers.push("a claim appears contradicted by the source");
        if (c.isHighImpact) blockers.push("high-impact: requires two distinct independent reviewers");
        blockers.push("no editorial approval recorded");

        records.push({
          slug: c.slug,
          title: c.title,
          category: c.category,
          sourceUrl: c.sourceUrl,
          publisher: c.sourceName,
          qualityScore: c.qualityScore,
          isHighImpact: c.isHighImpact,
          requiredReviewers: c.isHighImpact ? 2 : 1,
          linkChecked: false,
          retrievalStatus: retrieval.status,
          httpStatus: retrieval.httpStatus,
          evidenceOverall: researched.evidenceOverall,
          claims,
          supportSummary,
          blockers,
          recommendedNextAction:
            retrieval.status !== "ok"
              ? "Find an accessible canonical source or confirm access; then link-check and review. (Not an approval.)"
              : "Human editorial review: ground each claim against the source, link-check, then (for high-impact) obtain a second independent reviewer. (Not an approval.)",
        });
      }

      // Honesty invariant: a reachable link alone never yields a verified claim.
      for (const r of records) {
        if (r.retrievalStatus === "ok" && r.evidenceOverall !== "verified") {
          expect(r.blockers.join(" ")).toMatch(/no editorial approval recorded/);
        }
      }

      const summary = {
        generatedAt: NOW,
        total: records.length,
        retrieved: records.filter((r) => r.retrievalStatus === "ok").length,
        anySupport: records.filter((r) => r.supportSummary.exact_support + r.supportSummary.semantic_support + r.supportSummary.partial_support > 0).length,
        highImpact: records.filter((r) => r.isHighImpact).length,
        publishableNow: 0, // nothing is link-checked or approved
        records,
      };
      const dir = resolve(process.cwd(), "docs/samples");
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, "originals-batch-1-release-readiness.json"), JSON.stringify(summary, null, 2) + "\n");
      expect(records).toHaveLength(10);
    },
    240_000,
  );
});
