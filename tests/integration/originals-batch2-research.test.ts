import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BATCH2_CANDIDATES, prepareBatch2, classifyDuplicate } from "@/factory";
import { createHttpFetcher, DEFAULT_USER_AGENT, retrieveSource, researchDraft } from "@/factory/live";
import {
  buildReviewPack,
  batch2DedupCatalogue,
  type ReviewPack,
} from "@/factory/originals/batch2-research";
import type { ResearchedCard } from "@/factory/live";
import type { RubricAxis, RubricResult, RubricScores } from "@/factory/types";

const LIVE = process.env.FACTORY_LIVE === "1";
const NOW = "2026-11-21T00:00:00Z";
const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const AXES: RubricAxis[] = [
  "accuracy",
  "sourceReliability",
  "usefulness",
  "clarity",
  "practicalApplication",
  "originality",
  "safety",
  "freshness",
];
function rubric(composite: number, verdict: RubricResult["verdict"]): RubricResult {
  return {
    scores: Object.fromEntries(AXES.map((a) => [a, 4])) as RubricScores,
    reasons: Object.fromEntries(AXES.map((a) => [a, "ok"])) as Record<RubricAxis, string>,
    composite,
    floorBreaches: [],
    verdict,
  };
}

// A synthetic researched card so the pack builder is tested without a network.
function researched(): ResearchedCard {
  return {
    slug: "sample",
    category: "productivity",
    topic: "habits",
    level: "beginner",
    objective: "Do X.",
    title: "A sample card",
    takeaways: ["Supported claim.", "Unsupported claim."],
    nextStep: "Do the thing.",
    source: { url: "https://example.com/a", publisher: "Example" },
    retrieval: {
      url: "https://example.com/a",
      status: "ok",
      httpStatus: 200,
      retrievedAt: NOW,
      sourceDate: "2026-01-01",
      missingTimestamp: false,
      passageCount: 5,
    },
    verifications: [
      { claim: "Supported claim.", verdict: "verified", passage: "A real passage from the page.", overlap: 0.8, note: "match" },
      { claim: "Unsupported claim.", verdict: "unsupported", overlap: 0.2, note: "no match" },
    ],
    counts: { verified: 1, unsupported: 1, contradictory: 0, unavailable: 0 },
    evidenceOverall: "not_verified",
    quality: rubric(60, "revise"),
    safety: { isHighImpact: false, requiresSecondReviewer: false, disclaimers: [], riskNotes: [] },
    reviewStatus: "revise",
    requiresSecondReviewer: false,
  };
}

describe("buildReviewPack (pure, no network)", () => {
  const pack = buildReviewPack({
    candidate: BATCH2_CANDIDATES.find((c) => c.topic === "habits") ?? BATCH2_CANDIDATES[0]!,
    researched: researched(),
    passages: ["A real passage from the page about a supported claim.", "Unrelated filler text."],
    original: { composite: 30, verdict: "reject" },
    duplicate: classifyDuplicate({ url: "https://example.com/a", title: "A sample card" }, []),
  });

  it("carries a real excerpt only for a verified claim", () => {
    const verified = pack.claims.find((c) => c.verdict === "verified");
    const unsupported = pack.claims.find((c) => c.verdict === "unsupported");
    expect(verified?.excerpt).toBeTruthy();
    expect(unsupported?.excerpt).toBeUndefined();
  });

  it("preserves the original rubric and records the updated one separately", () => {
    expect(pack.rubric.original.verdict).toBe("reject");
    expect(pack.rubric.updated.verdict).toBe("revise");
  });

  it("lists evidence gaps and asks a reviewer question per unsupported claim", () => {
    expect(pack.evidenceGaps.join(" ")).toMatch(/Unsupported/);
    expect(pack.reviewerQuestions.some((q) => /substantiate/.test(q))).toBe(true);
  });

  it("recommends an action that is explicitly not an approval", () => {
    expect(pack.recommendedAction).toMatch(/Not an approval/);
  });

  it("classifies every claim's support, summing to the claim count", () => {
    const total = Object.values(pack.supportSummary).reduce((a, b) => a + b, 0);
    expect(total).toBe(pack.claims.length);
    for (const c of pack.claims) {
      expect(c.support.confersApproval).toBe(false);
    }
  });
});

// Live evidence gathering. Gated behind FACTORY_LIVE=1 so normal CI never hits
// the network. Read-only; robots-respected inside retrieveSource; polite delay.
describe("batch-2 live evidence gathering", () => {
  it.skipIf(!LIVE)(
    "retrieves real sources, verifies claims, and writes honest review packs",
    async () => {
      const fetcher = createHttpFetcher(DEFAULT_USER_AGENT);
      const originals = new Map(
        prepareBatch2().candidates.map((c) => [c.slug, { composite: c.qualityComposite, verdict: c.qualityVerdict }]),
      );
      const packs: ReviewPack[] = [];

      for (const candidate of BATCH2_CANDIDATES) {
        const retrieval = await retrieveSource(candidate.source.url, {
          fetcher,
          ua: DEFAULT_USER_AGENT,
          now: NOW,
          beforeRequest: () => delay(1500),
        });
        const card = researchDraft(candidate, retrieval, { now: NOW });
        const duplicate = classifyDuplicate(
          { url: candidate.source.url, title: candidate.title },
          batch2DedupCatalogue(BATCH2_CANDIDATES, candidate),
        );
        packs.push(
          buildReviewPack({
            candidate,
            researched: card,
            passages: retrieval.passages,
            original: originals.get(candidate.slug) ?? { composite: 0, verdict: "reject" },
            duplicate,
          }),
        );
      }

      // Honesty invariant: a verified claim must carry a real excerpt.
      for (const p of packs) {
        for (const c of p.claims) {
          if (c.verdict === "verified") expect(c.excerpt && c.excerpt.length > 0).toBe(true);
        }
      }

      const supportTotals = packs
        .flatMap((p) => p.claims.map((c) => c.support.supportClass))
        .reduce<Record<string, number>>((acc, k) => ({ ...acc, [k]: (acc[k] ?? 0) + 1 }), {});
      const summary = {
        generatedAt: NOW,
        total: packs.length,
        retrieved: packs.filter((p) => p.provenance.retrievalStatus === "ok").length,
        anyClaimVerified: packs.filter((p) => p.counts.verified > 0).length,
        fullyVerified: packs.filter((p) => p.evidenceOverall === "verified").length,
        anySupportOrPartial: packs.filter(
          (p) => p.supportSummary.exact_support + p.supportSummary.semantic_support + p.supportSummary.partial_support > 0,
        ).length,
        contradictionsFound: packs.filter((p) => p.supportSummary.contradiction > 0).length,
        updatedQueue: packs.filter((p) => p.rubric.updated.verdict === "queue").length,
        highImpact: packs.filter((p) => p.highImpact.isHighImpact).length,
        claimSupportTotals: supportTotals,
        packs,
      };
      const dir = resolve(process.cwd(), "docs/samples");
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, "originals-batch-2-review-packs.json"), JSON.stringify(summary, null, 2) + "\n");

      expect(packs).toHaveLength(BATCH2_CANDIDATES.length);
    },
    240_000,
  );
});
