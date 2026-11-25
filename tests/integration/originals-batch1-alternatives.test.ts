import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createHttpFetcher, DEFAULT_USER_AGENT, retrieveSource } from "@/factory/live";
import { classifyClaimSupport } from "@/factory/live/verify-support";

/**
 * Investigate reputable, accessible ALTERNATIVE sources for the two batch-1
 * Originals whose original sources were inaccessible (Phase 10.17 task 4).
 *
 * Read-only, robots-respected, FACTORY_LIVE=1-gated. It reports which candidate
 * sources are retrievable and whether the card's claims find textual support —
 * it never invents support, and a reachable link is never a verified claim.
 */

const LIVE = process.env.FACTORY_LIVE === "1";
const NOW = "2026-11-21T00:00:00Z";
const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const INVESTIGATIONS = [
  {
    slug: "building-a-first-monthly-budget",
    originalSource: "https://www.moneyhelper.org.uk/en/everyday-money/budgeting/budget-planner (robots-disallowed)",
    claims: [
      "Writing fixed costs down is what makes them negotiable.",
      "A budget is a plan for money you have, not a prediction of money you might get.",
    ],
    candidates: [
      { url: "https://www.citizensadvice.org.uk/debt-and-money/budgeting/budgeting/work-out-your-budget/", publisher: "Citizens Advice" },
      { url: "https://www.moneyhelper.org.uk/en/everyday-money/budgeting/how-to-budget", publisher: "MoneyHelper" },
    ],
  },
  {
    slug: "asking-for-your-own-data",
    originalSource: "https://ico.org.uk/for-the-public/your-right-to-get-copies-of-your-data/ (http_error)",
    claims: [
      "You can ask any organisation for a copy of the personal data it holds about you.",
      "A request does not have to use any particular wording or form.",
    ],
    candidates: [
      { url: "https://www.gov.uk/data-protection", publisher: "GOV.UK" },
      { url: "https://ico.org.uk/for-the-public/data-protection-and-you/your-right-of-access/", publisher: "Information Commissioner's Office" },
    ],
  },
];

describe("batch-1 inaccessible-source alternatives", () => {
  it("names two cards to investigate", () => {
    expect(INVESTIGATIONS).toHaveLength(2);
  });

  it.skipIf(!LIVE)(
    "retrieves candidate alternatives read-only and classifies the claims",
    async () => {
      const fetcher = createHttpFetcher(DEFAULT_USER_AGENT);
      const results = [];

      for (const inv of INVESTIGATIONS) {
        const candidateResults = [];
        for (const cand of inv.candidates) {
          const retrieval = await retrieveSource(cand.url, {
            fetcher,
            ua: DEFAULT_USER_AGENT,
            now: NOW,
            beforeRequest: () => delay(1500),
          });
          const claims =
            retrieval.status === "ok"
              ? inv.claims.map((t) => {
                  const s = classifyClaimSupport(t, retrieval.passages);
                  return { claim: t, supportClass: s.supportClass, overlap: s.lemmatisedOverlap, excerpt: s.supportClass === "insufficient_evidence" ? undefined : s.passage };
                })
              : inv.claims.map((t) => ({ claim: t, supportClass: "insufficient_evidence" as const, overlap: 0, excerpt: undefined }));
          candidateResults.push({
            url: cand.url,
            publisher: cand.publisher,
            retrievalStatus: retrieval.status,
            httpStatus: retrieval.httpStatus,
            passageCount: retrieval.passages.length,
            claims,
          });
        }
        results.push({ slug: inv.slug, originalSource: inv.originalSource, candidates: candidateResults });
      }

      // Honesty: a candidate that did not retrieve carries no support.
      for (const r of results) {
        for (const c of r.candidates) {
          if (c.retrievalStatus !== "ok") {
            expect(c.claims.every((cl) => cl.supportClass === "insufficient_evidence")).toBe(true);
          }
        }
      }

      const dir = resolve(process.cwd(), "docs/samples");
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, "originals-batch-1-source-alternatives.json"), JSON.stringify({ generatedAt: NOW, results }, null, 2) + "\n");
      expect(results).toHaveLength(2);
    },
    180_000,
  );
});
