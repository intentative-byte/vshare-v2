import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createHttpFetcher, DEFAULT_USER_AGENT, retrieveSource } from "@/factory/live";
import { classifyClaimSupport, topPassages } from "@/factory/live/verify-support";

/**
 * Card 7 ("setting-up-a-business-uk") evidence verification (Phase 10.18 task 1).
 *
 * Retrieves the card's GOV.UK source plus the specific registration pages, and
 * surfaces the REAL passages about tax/liability and registration deadlines so a
 * human can judge whether claim 2 holds across business structures. Read-only,
 * robots-respected, FACTORY_LIVE=1-gated. Nothing is verified automatically.
 */

const LIVE = process.env.FACTORY_LIVE === "1";
const NOW = "2026-11-21T00:00:00Z";
const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const CLAIM_1 = "The legal structure you choose changes your tax and your personal liability.";
const CLAIM_2 = "Registration deadlines start from when you begin trading, not when you incorporate.";

const SOURCES = [
  { url: "https://www.gov.uk/set-up-business", label: "card source: Set up a business" },
  { url: "https://www.gov.uk/set-up-sole-trader", label: "sole trader" },
  { url: "https://www.gov.uk/register-for-corporation-tax", label: "limited company / corporation tax" },
];

const DEADLINE_RE = /\b(register|registration|deadline|trading|incorporat|5 october|three months|3 months|self assessment|corporation tax)\b/i;

describe("card 7 evidence verification", () => {
  it("targets the GOV.UK set-up-business source", () => {
    expect(SOURCES[0]!.url).toBe("https://www.gov.uk/set-up-business");
  });

  it.skipIf(!LIVE)(
    "surfaces real passages for both claims across sources",
    async () => {
      const fetcher = createHttpFetcher(DEFAULT_USER_AGENT);
      const out = [];
      for (const src of SOURCES) {
        const r = await retrieveSource(src.url, { fetcher, ua: DEFAULT_USER_AGENT, now: NOW, beforeRequest: () => delay(1500) });
        out.push({
          url: src.url,
          label: src.label,
          status: r.status,
          httpStatus: r.httpStatus,
          passageCount: r.passages.length,
          claim1: { supportClass: classifyClaimSupport(CLAIM_1, r.passages).supportClass, top: topPassages(CLAIM_1, r.passages, 3) },
          claim2: { supportClass: classifyClaimSupport(CLAIM_2, r.passages).supportClass, top: topPassages(CLAIM_2, r.passages, 3) },
          deadlinePassages: r.passages.filter((p) => DEADLINE_RE.test(p)).slice(0, 8),
        });
      }
      mkdirSync(resolve(process.cwd(), "docs/samples"), { recursive: true });
      writeFileSync(resolve(process.cwd(), "docs/samples/originals-card7-verification.json"), JSON.stringify({ generatedAt: NOW, claim1: CLAIM_1, claim2: CLAIM_2, sources: out }, null, 2) + "\n");
      expect(out).toHaveLength(SOURCES.length);
    },
    240_000,
  );
});
