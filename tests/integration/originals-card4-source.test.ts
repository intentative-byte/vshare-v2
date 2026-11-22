import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createHttpFetcher, DEFAULT_USER_AGENT, retrieveSource } from "@/factory/live";
import { classifyClaimSupport, topPassages } from "@/factory/live/verify-support";

/**
 * Card 4 ("asking-for-your-own-data") source investigation (owner option A).
 *
 * Checks the SPECIFIC GOV.UK subject-access page (and an ICO fallback) against
 * Card 4's exact claims, recording real passages. Read-only, robots-respected,
 * FACTORY_LIVE=1-gated. No content is modified; nothing is verified automatically.
 */

const LIVE = process.env.FACTORY_LIVE === "1";
const NOW = "2026-11-21T00:00:00Z";
const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const CLAIMS = [
  "You can ask any organisation for a copy of the personal data it holds about you.",
  "A request does not have to use any particular wording or form.",
];

const CANDIDATES = [
  { url: "https://www.gov.uk/data-protection/find-out-what-data-an-organisation-has-about-you", publisher: "GOV.UK" },
  { url: "https://ico.org.uk/for-the-public/make-a-subject-access-request", publisher: "Information Commissioner's Office" },
];

describe("card 4 source investigation (option A)", () => {
  it("names the specific GOV.UK SAR page as the primary candidate", () => {
    expect(CANDIDATES[0]!.url).toContain("find-out-what-data-an-organisation-has-about-you");
  });

  it.skipIf(!LIVE)(
    "retrieves the specific SAR pages and tests Card 4's claims against real passages",
    async () => {
      const fetcher = createHttpFetcher(DEFAULT_USER_AGENT);
      const results = [];
      for (const cand of CANDIDATES) {
        const retrieval = await retrieveSource(cand.url, {
          fetcher, ua: DEFAULT_USER_AGENT, now: NOW, beforeRequest: () => delay(1500),
        });
        const claims = CLAIMS.map((claim) => ({
          claim,
          supportClass: classifyClaimSupport(claim, retrieval.passages).supportClass,
          topPassages: topPassages(claim, retrieval.passages, 3),
        }));
        results.push({
          url: cand.url, publisher: cand.publisher,
          retrievalStatus: retrieval.status, httpStatus: retrieval.httpStatus,
          passageCount: retrieval.passages.length, claims,
        });
      }
      for (const r of results) {
        if (r.retrievalStatus !== "ok") expect(r.claims.every((c) => c.topPassages.length === 0)).toBe(true);
      }
      mkdirSync(resolve(process.cwd(), "docs/samples"), { recursive: true });
      writeFileSync(resolve(process.cwd(), "docs/samples/originals-card4-source.json"), JSON.stringify({ generatedAt: NOW, claims: CLAIMS, results }, null, 2) + "\n");
      expect(results).toHaveLength(2);
    },
    180_000,
  );
});
