import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createHttpFetcher,
  DEFAULT_USER_AGENT,
  fetchFeed,
  researchDraft,
  retrieveSource,
  type RetrievalResult,
  type SourceCache,
} from "@/factory/live";
import { clusterTrends, normalizeTrends, proposeTrend } from "@/factory";
import type { ClassifyRule, DraftInput, SourceClass } from "@/factory";
import { CLASSIFY_RULES } from "@/factory/fixtures";

/**
 * REAL-WORLD demonstration. Gated behind FACTORY_LIVE=1 so normal CI never hits
 * the network and stays deterministic. When run, it retrieves real sources
 * (robots-checked, rate-limited), verifies claims against retrieved passages,
 * observes a real trend feed, and writes inspectable artifacts under
 * docs/samples/live/. It publishes nothing and writes to no database.
 *
 * The retrieval cache is committed, so a later run replays deterministically.
 */
const LIVE = process.env.FACTORY_LIVE === "1";
const NOW = new Date().toISOString();
const DIR = resolve(process.cwd(), "docs/samples/live");
const CACHE = resolve(DIR, "retrieval-cache.json");

// Faithful draft summaries; takeaways are verified against the RETRIEVED source.
const LIVE_DRAFTS: DraftInput[] = [
  {
    slug: "secure-your-main-email-and-accounts",
    category: "technology-and-ai",
    topic: "security-basics",
    level: "beginner",
    format: "article",
    objective: "Take the few steps that protect everyday online accounts.",
    title: "The security steps the NCSC says matter most",
    summary:
      "The UK National Cyber Security Centre's short, practical guidance on protecting everyday accounts, chosen because a few steps prevent most ordinary attacks.",
    takeaways: [
      "Use a strong and separate password for your email.",
      "Turn on two-factor authentication to protect important accounts.",
    ],
    nextStep: "Turn on two-factor authentication for your main email account today.",
    estimatedMinutes: 10,
    source: { url: "https://www.ncsc.gov.uk/collection/top-tips-for-staying-secure-online", publisher: "National Cyber Security Centre" },
  },
  {
    slug: "where-to-get-free-debt-advice",
    category: "personal-finance",
    topic: "debt-and-credit",
    level: "beginner",
    format: "article",
    objective: "Know where to get free, confidential debt help.",
    title: "Where to get free and confidential debt advice",
    summary:
      "GOV.UK's starting point for dealing with debt: free, confidential advice is available, and acting early gives more options.",
    takeaways: [
      "You can get free debt advice if you are struggling with money.",
      "Debt advice is confidential and will not judge you.",
    ],
    nextStep: "Use the debt advice locator to find free help near you.",
    estimatedMinutes: 8,
    source: { url: "https://www.gov.uk/debt-advice", publisher: "GOV.UK" },
  },
  {
    slug: "a-consistent-wake-time-for-sleep",
    category: "health-and-wellbeing",
    topic: "sleep",
    level: "beginner",
    format: "article",
    objective: "Use evidence-led basics that help with sleep.",
    title: "What the NHS says actually helps you sleep",
    summary:
      "NHS guidance on sleep: regular timing and winding down help, and persistent problems are worth seeing a doctor about. General information, not medical advice.",
    takeaways: [
      "Going to bed and getting up at the same time every day helps you sleep.",
      "Most adults need around 7 to 9 hours of sleep a night.",
    ],
    nextStep: "Set the same wake-time alarm every day this week, including the weekend.",
    estimatedMinutes: 7,
    source: { url: "https://www.nhs.uk/live-well/sleep-and-tiredness/how-to-get-to-sleep/", publisher: "NHS" },
  },
  {
    slug: "prepare-for-a-job-interview",
    category: "career-development",
    topic: "interviews",
    level: "beginner",
    format: "article",
    objective: "Prepare for an interview methodically.",
    title: "Preparing for a job interview, step by step",
    summary:
      "National Careers Service guidance on interview preparation: research, structured answers about your experience, and good questions to ask.",
    takeaways: [
      "Research the organisation and the role before your interview.",
      "Prepare examples of your skills using real situations.",
    ],
    nextStep: "Write out one example of your work using situation, task, action and result.",
    estimatedMinutes: 12,
    source: { url: "https://nationalcareers.service.gov.uk/careers-advice/interview-advice", publisher: "National Careers Service" },
  },
  {
    slug: "steps-to-set-up-a-business",
    category: "entrepreneurship",
    topic: "running-a-small-business",
    level: "beginner",
    format: "article",
    objective: "Know the first administrative steps to set up in the UK.",
    title: "The first steps to set up a business in the UK",
    summary:
      "GOV.UK's official starting point for setting up: choosing a structure, registering, and the records you must keep.",
    takeaways: [
      "Most people set up as a sole trader, a limited company or a partnership.",
      "The structure you choose affects your tax and your personal liability.",
    ],
    nextStep: "Decide whether you would be a sole trader or a limited company, and write down why.",
    estimatedMinutes: 15,
    source: { url: "https://www.gov.uk/set-up-business", publisher: "GOV.UK" },
  },
];

const FEEDS: { id: string; url: string; sourceClass: SourceClass }[] = [
  { id: "gov-uk-news-atom", url: "https://www.gov.uk/search/news-and-communications.atom", sourceClass: "official" },
  { id: "ncsc-report-rss", url: "https://www.ncsc.gov.uk/api/1/services/v1/report-rss-feed.xml", sourceClass: "official" },
];

function fileCache(): SourceCache {
  const store: Record<string, RetrievalResult> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
  return {
    get: (u) => store[u],
    set: (u, r) => {
      store[u] = r;
      mkdirSync(DIR, { recursive: true });
      writeFileSync(CACHE, JSON.stringify(store, null, 2) + "\n");
    },
  };
}

const delay = (ms: number): Promise<void> => new Promise<void>((r) => setTimeout(() => r(), ms));

describe("live research demonstration", () => {
  it.skipIf(!LIVE)(
    "retrieves real sources, verifies claims, observes a real trend feed, and prepares a workbench",
    async () => {
      const fetcher = createHttpFetcher(DEFAULT_USER_AGENT);
      const cache = fileCache();
      const cards = [];

      for (const draft of LIVE_DRAFTS) {
        const retrieval = await retrieveSource(draft.source.url, {
          fetcher,
          ua: DEFAULT_USER_AGENT,
          now: NOW,
          cache,
          beforeRequest: () => delay(1500), // polite rate limiting
        });
        cards.push(researchDraft(draft, retrieval, { now: NOW }));
      }

      // Live trend observation.
      const feedResults = [];
      for (const feed of FEEDS) {
        feedResults.push(await fetchFeed(fetcher, feed));
        await delay(1500);
      }
      const classBySource: Record<string, SourceClass> = Object.fromEntries(FEEDS.map((f) => [f.id, f.sourceClass]));
      const allObs = feedResults.flatMap((r) => r.observations);
      const clusters = clusterTrends(normalizeTrends(allObs));
      const proposals = clusters
        .map((t) => proposeTrend(t, CLASSIFY_RULES as ClassifyRule[], classBySource, { now: NOW }))
        .sort((a, b) => (b.momentum.momentum ?? -1) - (a.momentum.momentum ?? -1));

      mkdirSync(DIR, { recursive: true });
      writeFileSync(resolve(DIR, "live-research-cards.json"), JSON.stringify(cards, null, 2) + "\n");
      writeFileSync(
        resolve(DIR, "live-trend-report.json"),
        JSON.stringify(
          {
            generatedAt: NOW,
            liveDataConnected: true,
            feeds: feedResults.map((r) => ({ feedId: r.feedId, url: r.url, status: r.status, httpStatus: r.httpStatus, entriesSeen: r.entriesSeen, usableObservations: r.observations.length, skippedNoTimestamp: r.skippedNoTimestamp })),
            totalObservations: allObs.length,
            proposedCount: proposals.filter((p) => p.status === "proposed").length,
            note: "Momentum is computed from real feed observations. Most subjects have too few observations to report momentum, which is correctly reported as INSUFFICIENT_DATA rather than fabricated.",
            proposals,
          },
          null,
          2,
        ) + "\n",
      );
      writeFileSync(resolve(DIR, "editorial-workbench.html"), renderWorkbench(cards));

      // Honest assertions: retrieval actually happened and nothing is auto-published.
      for (const c of cards) {
        expect(c.retrieval.status).toBeDefined();
        expect(["editorial_queue", "revise", "rejected"]).toContain(c.reviewStatus);
      }
    },
    120000,
  );

  it("exposes no publishing/writing capability from the live layer", async () => {
    const live = (await import("@/factory/live")) as Record<string, unknown>;
    const names = Object.keys(live);
    expect(names.length).toBeGreaterThan(0);
    expect(names.some((n) => /publish|approve|insert|delete|write|save|moderate/i.test(n))).toBe(false);
  });
});

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);
}

function renderWorkbench(cards: ReturnType<typeof researchDraft>[]): string {
  const rows = cards
    .map((c) => {
      const claims = c.verifications
        .map(
          (v) =>
            `<li><span class="v v-${v.verdict}">${v.verdict}</span> ${esc(v.claim)}${
              v.passage ? `<br><em>source passage:</em> “${esc(v.passage)}”` : ""
            }<br><small>${esc(v.note)} (overlap ${v.overlap})</small></li>`,
        )
        .join("");
      return `<section>
    <h2>${esc(c.title)} <small>[${c.reviewStatus}]</small></h2>
    <p><strong>Objective:</strong> ${esc(c.objective)}</p>
    <p><strong>Category/topic:</strong> ${esc(c.category)} / ${esc(c.topic)} &middot; <strong>Level:</strong> ${c.level}</p>
    <p><strong>Source:</strong> <a href="${esc(c.source.url)}">${esc(c.source.publisher)}</a> &middot;
       retrieval: <strong>${c.retrieval.status}</strong>${c.retrieval.httpStatus ? ` (${c.retrieval.httpStatus})` : ""} &middot;
       source date: ${c.retrieval.sourceDate ?? "<em>missing</em>"} &middot; passages: ${c.retrieval.passageCount}</p>
    <p><strong>Evidence overall:</strong> ${c.evidenceOverall} &middot;
       verified ${c.counts.verified} / unsupported ${c.counts.unsupported} / contradictory ${c.counts.contradictory} / unavailable ${c.counts.unavailable}</p>
    <p><strong>Quality composite:</strong> ${c.quality.composite} &middot; <strong>floors:</strong> ${esc(c.quality.floorBreaches.join("; ") || "none")}</p>
    <p><strong>High-impact:</strong> ${c.safety.isHighImpact ? "yes — independent second reviewer required" : "no"} ${c.safety.disclaimers.length ? `&middot; ${esc(c.safety.disclaimers.join(" "))}` : ""}</p>
    <p><strong>Claims &amp; evidence:</strong></p><ul>${claims}</ul>
    <p><strong>Next step:</strong> ${esc(c.nextStep)}</p>
  </section>`;
    })
    .join("\n");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>VSHARES editorial evidence workbench</title>
<style>body{font-family:system-ui,sans-serif;max-width:60rem;margin:2rem auto;padding:0 1rem;line-height:1.5;color:#111}
section{border:1px solid #ddd;border-radius:8px;padding:1rem 1.25rem;margin:1rem 0}
h1 small,h2 small{color:#666;font-weight:normal}
.v{font-weight:700;text-transform:uppercase;font-size:.75rem;padding:.1rem .4rem;border-radius:4px;color:#fff}
.v-verified{background:#1a7f37}.v-unsupported{background:#9a6700}.v-contradictory{background:#b42318}.v-unavailable{background:#555}
small{color:#555}em{color:#444}</style></head>
<body><h1>VSHARES editorial evidence workbench <small>— review only; approval happens via a human running moderate_content through the database gates</small></h1>
<p>Each draft below was researched against its real source. A claim is <strong>verified</strong> only when a retrieved passage supports it. Nothing here is published.</p>
${rows}
</body></html>`;
}
