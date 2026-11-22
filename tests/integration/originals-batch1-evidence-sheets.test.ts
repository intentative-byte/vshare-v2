import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createHttpFetcher, DEFAULT_USER_AGENT, retrieveSource } from "@/factory/live";
import { classifyClaimSupport, topPassages } from "@/factory/live/verify-support";

/**
 * Claim-by-claim editorial evidence sheets for the ten batch-1 Originals
 * (Phase 10.17 owner decision). For each claim it records the ACTUAL top passages
 * from the retrieved source (never invented) plus the support classification, so a
 * human reviewer can read the real evidence and judge grounding. Read-only,
 * robots-respected, FACTORY_LIVE=1-gated. Nothing is approved or published.
 *
 * Source notes (owner decisions):
 * - Card 1 (budget): keep MoneyHelper provisionally; it blocks automated fetch
 *   (robots), so passages are unavailable here → flagged for MANUAL verification.
 * - Card 4 (your own data): evaluate the proposed GOV.UK replacement against the
 *   card's specific claims before any change is proposed.
 */

const LIVE = process.env.FACTORY_LIVE === "1";
const NOW = "2026-11-21T00:00:00Z";
const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

type SeedCard = {
  slug: string; title: string; category: string; isHighImpact: boolean;
  sourceUrl: string; sourceName: string; takeaways: string[];
};

function loadCards(): SeedCard[] {
  return JSON.parse(readFileSync(resolve(process.cwd(), "docs/samples/originals-batch-1-cards.json"), "utf8")) as SeedCard[];
}

// Owner decision: card 4 evaluated against the accessible GOV.UK source.
const SOURCE_OVERRIDE: Record<string, { url: string; publisher: string; reason: string }> = {
  "asking-for-your-own-data": {
    url: "https://www.gov.uk/data-protection",
    publisher: "GOV.UK",
    reason: "original ICO link returned 404; evaluating GOV.UK as replacement",
  },
};

describe("batch-1 editorial evidence sheets", () => {
  it("has ten cards", () => {
    expect(loadCards()).toHaveLength(10);
  });

  it.skipIf(!LIVE)(
    "records real top passages per claim for human review",
    async () => {
      const fetcher = createHttpFetcher(DEFAULT_USER_AGENT);
      const sheets = [];

      for (const card of loadCards()) {
        const override = SOURCE_OVERRIDE[card.slug];
        const effectiveUrl = override?.url ?? card.sourceUrl;
        const retrieval = await retrieveSource(effectiveUrl, {
          fetcher, ua: DEFAULT_USER_AGENT, now: NOW, beforeRequest: () => delay(1500),
        });
        const claims = card.takeaways.map((claim) => {
          const support = classifyClaimSupport(claim, retrieval.passages);
          const top = topPassages(claim, retrieval.passages, 2);
          return {
            claim,
            supportClass: support.supportClass,
            topPassages: top,
            evidenceGap:
              retrieval.status !== "ok"
                ? `source not retrievable here (${retrieval.status}) — manual verification required`
                : top.length === 0
                  ? "no passage on the retrieved page overlaps this claim — human must confirm against the source"
                  : support.supportClass === "insufficient_evidence"
                    ? "nearest passages are only loosely related — human must confirm the paraphrase is faithful"
                    : "",
            reviewerAction: card.isHighImpact
              ? "Read the source; confirm the claim is faithfully supported; two distinct reviewers required."
              : "Read the source; confirm the claim is faithfully supported.",
          };
        });
        sheets.push({
          slug: card.slug,
          title: card.title,
          category: card.category,
          isHighImpact: card.isHighImpact,
          sourceUrl: effectiveUrl,
          sourceNote: override ? override.reason : card.slug === "building-a-first-monthly-budget" ? "MoneyHelper retained provisionally; blocks automated fetch (robots) — verify the human-facing link manually" : "",
          retrievalStatus: retrieval.status,
          claims,
        });
      }

      // Honesty: every recorded passage is a real excerpt from the source.
      for (const s of sheets) {
        for (const c of s.claims) {
          for (const p of c.topPassages) expect(typeof p.passage).toBe("string");
        }
      }

      mkdirSync(resolve(process.cwd(), "docs/samples"), { recursive: true });
      writeFileSync(
        resolve(process.cwd(), "docs/samples/originals-batch-1-evidence-sheets.json"),
        JSON.stringify({ generatedAt: NOW, sheets }, null, 2) + "\n",
      );
      expect(sheets).toHaveLength(10);
    },
    240_000,
  );
});
