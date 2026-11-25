import { describe, expect, it, vi } from "vitest";
import {
  checkRobots,
  extractPassages,
  fetchFeed,
  HttpError,
  parseFeed,
  parseRobots,
  researchDraft,
  retrieveSource,
  robotsAllowsPath,
  verifyClaims,
  type HttpFetcher,
  type HttpResponse,
  type RetrievalResult,
  type SourceCache,
} from "@/factory/live";
import { clusterTrends, computeMomentum, normalizeTrends, proposeTrend } from "@/factory";
import type { DraftInput, SourceClass } from "@/factory";

const UA = "VSHARES-ContentFactory/0.1";
const NOW = "2026-11-18T00:00:00Z";
const ok = (text: string, headers: Record<string, string> = {}): HttpResponse => ({ status: 200, headers, text });

function fetcher(routes: Record<string, () => Promise<HttpResponse>>): HttpFetcher {
  return async (url) => {
    const h = routes[url];
    if (!h) return { status: 404, headers: {}, text: "" };
    return h();
  };
}

const base = (status: RetrievalResult["status"], passages: string[] = []): RetrievalResult => ({
  url: "https://www.nhs.uk/x",
  status,
  retrievedAt: NOW,
  missingTimestamp: false,
  passages,
});

const draft: DraftInput = {
  slug: "sleep-consistent-wake-time",
  category: "health-and-wellbeing",
  topic: "sleep",
  level: "beginner",
  format: "article",
  objective: "Improve sleep with a consistent wake time.",
  title: "A consistent wake time helps you sleep",
  summary:
    "NHS guidance on sleep explains that regular timing, especially a consistent wake time, helps more than a fixed bedtime, and when to see a doctor.",
  takeaways: ["A consistent wake time does more for sleep than a consistent bedtime."],
  nextStep: "Set the same wake-time alarm every day this week.",
  estimatedMinutes: 7,
  source: { url: "https://www.nhs.uk/live-well/sleep-and-tiredness/how-to-get-to-sleep/", publisher: "NHS" },
};

// --- PRIORITY 1: retrieval failure modes (no fabrication) ---
describe("source retrieval failure modes are recorded, not fabricated", () => {
  const robots404 = { "https://ex.test/robots.txt": async () => ({ status: 404, headers: {}, text: "" }) };
  it("records a network error (robots ok, page throws)", async () => {
    const f = fetcher({ ...robots404, "https://ex.test/p": async () => { throw new HttpError("down", "network"); } });
    const r = await retrieveSource("https://ex.test/p", { fetcher: f, ua: UA, now: NOW });
    expect(r.status).toBe("network_error");
    expect(r.passages).toEqual([]);
  });
  it("records a timeout", async () => {
    const f = fetcher({ ...robots404, "https://ex.test/p": async () => { throw new HttpError("t", "timeout"); } });
    expect((await retrieveSource("https://ex.test/p", { fetcher: f, ua: UA, now: NOW })).status).toBe("timeout");
  });
  it("records a rate limit (429)", async () => {
    const f = fetcher({ ...robots404, "https://ex.test/p": async () => ({ status: 429, headers: {}, text: "" }) });
    expect((await retrieveSource("https://ex.test/p", { fetcher: f, ua: UA, now: NOW })).status).toBe("rate_limited");
  });
  it("records an http error (500)", async () => {
    const f = fetcher({ ...robots404, "https://ex.test/p": async () => ({ status: 500, headers: {}, text: "" }) });
    const r = await retrieveSource("https://ex.test/p", { fetcher: f, ua: UA, now: NOW });
    expect(r.status).toBe("http_error");
    expect(r.httpStatus).toBe(500);
  });
  it("obeys a robots Disallow and never fetches the page", async () => {
    const f = fetcher({ "https://ex.test/robots.txt": async () => ok("User-agent: *\nDisallow: /") });
    expect((await retrieveSource("https://ex.test/secret", { fetcher: f, ua: UA, now: NOW })).status).toBe("disallowed");
  });
  it("treats an unreadable robots.txt (fetch throws) as robots_unavailable", async () => {
    const f = fetcher({ "https://ex.test/robots.txt": async () => { throw new HttpError("x", "network"); } });
    expect((await retrieveSource("https://ex.test/p", { fetcher: f, ua: UA, now: NOW })).status).toBe("robots_unavailable");
  });
});

describe("robots parsing", () => {
  it("allows a path not disallowed and blocks a disallowed one", () => {
    const g = parseRobots("User-agent: *\nDisallow: /search/all*\nDisallow: /*/print$");
    expect(robotsAllowsPath(g, UA, "/debt-advice").allowed).toBe(true);
    expect(robotsAllowsPath(g, UA, "/search/all?q=x").allowed).toBe(false);
    expect(robotsAllowsPath(g, UA, "/guide/print").allowed).toBe(false);
  });
  it("returns allowed for a 404 robots.txt", async () => {
    const f = fetcher({ "https://ex.test/robots.txt": async () => ({ status: 404, headers: {}, text: "" }) });
    expect((await checkRobots(f, "https://ex.test/p", UA)).decision).toBe("allowed");
  });
});

describe("passage extraction and timestamps", () => {
  it("strips markup and keeps sentence-length passages", () => {
    const p = extractPassages("<h1>Title</h1><p>A consistent wake time does more for sleep than a fixed bedtime.</p><script>x()</script>");
    expect(p.some((s) => s.includes("consistent wake time"))).toBe(true);
    expect(p.some((s) => s.includes("x()"))).toBe(false);
  });
  it("reports a missing timestamp rather than guessing one", async () => {
    const f = fetcher({ "https://ex.test/robots.txt": async () => ({ status: 404, headers: {}, text: "" }), "https://ex.test/p": async () => ok("<p>Some content sentence that is long enough to be a passage here.</p>") });
    const r = await retrieveSource("https://ex.test/p", { fetcher: f, ua: UA, now: NOW });
    expect(r.missingTimestamp).toBe(true);
    expect(r.sourceDate).toBeUndefined();
  });
  it("reads a Last-Modified header when present", async () => {
    const f = fetcher({ "https://ex.test/robots.txt": async () => ({ status: 404, headers: {}, text: "" }), "https://ex.test/p": async () => ok("<p>Long enough content sentence for a passage to be captured here.</p>", { "last-modified": "Wed, 01 Oct 2025 10:00:00 GMT" }) });
    const r = await retrieveSource("https://ex.test/p", { fetcher: f, ua: UA, now: NOW });
    expect(r.missingTimestamp).toBe(false);
    expect(r.sourceDate).toContain("2025-10-01");
  });
});

// --- claim verification: the four verdicts, and fake-citation rejection ---
describe("claim verification against retrieved passages", () => {
  const retr = base("ok", [
    "A consistent wake time does more for sleep than a consistent bedtime.",
    "Two-factor authentication does not block attacks on its own without care.",
  ]);
  it("marks a claim verified when a retrieved passage supports it", () => {
    const [v] = verifyClaims([{ text: "A consistent wake time helps sleep more than a bedtime." }], retr);
    expect(v?.verdict).toBe("verified");
    expect(v?.passage).toContain("consistent wake time");
  });
  it("marks a claim unsupported when nothing supports it", () => {
    expect(verifyClaims([{ text: "Bananas are a tropical yellow fruit." }], retr)[0]?.verdict).toBe("unsupported");
  });
  it("flags a contradictory passage", () => {
    expect(verifyClaims([{ text: "Two-factor authentication blocks attacks." }], retr)[0]?.verdict).toBe("contradictory");
  });
  it("rejects a supplied quote that is not in the source (fake citation)", () => {
    const v = verifyClaims([{ text: "x", quote: "This sentence was never published by the source." }], retr)[0];
    expect(v?.verdict).toBe("unsupported");
    expect(v?.note).toMatch(/fabrication|not found/i);
  });
  it("marks all claims unavailable when the source was not retrieved", () => {
    expect(verifyClaims([{ text: "anything" }], base("timeout"))[0]?.verdict).toBe("unavailable");
  });
  it("never treats publisher reputation alone as verification", () => {
    // Reputable source but no retrieved passage support ⇒ not verified.
    const card = researchDraft(draft, base("ok", ["Totally unrelated content about gardening."]), { now: NOW });
    expect(card.evidenceOverall).toBe("not_verified");
    expect(card.reviewStatus).not.toBe("editorial_queue");
  });
});

// --- TAI: feed parsing, insufficient data, staleness, duplicate clustering ---
describe("live trend observation", () => {
  const atom = `<feed><entry><title>Passkeys guidance updated</title><updated>2026-11-17T00:00:00Z</updated><id>u1</id></entry>
    <entry><title>Passkeys guidance updated</title><updated>2026-11-16T00:00:00Z</updated><id>u2</id></entry>
    <entry><title>No timestamp here</title><id>u3</id></entry></feed>`;
  it("parses real timestamped observations and skips timestampless entries", () => {
    const r = parseFeed(atom, "gov-atom");
    expect(r.observations.length).toBe(2);
    expect(r.skippedNoTimestamp).toBe(1);
    expect(r.observations[0]?.sourceId).toBe("gov-atom");
    expect(r.observations[0]?.observedAt).toBe("2026-11-17T00:00:00.000Z");
  });
  it("reports a feed http error without inventing observations", async () => {
    const f = fetcher({ "https://ex.test/feed": async () => ({ status: 503, headers: {}, text: "" }) });
    const r = await fetchFeed(f, { id: "f", url: "https://ex.test/feed" });
    expect(r.status).toBe("http_error");
    expect(r.observations).toEqual([]);
  });
  it("requires enough observations before reporting momentum", () => {
    const [trend] = normalizeTrends(parseFeed(atom, "gov-atom").observations);
    expect(computeMomentum(trend!, { now: NOW }).status).toBe("insufficient_data"); // 2 obs < 4
  });
  it("marks a stale trend expired", () => {
    const obs = parseFeed(
      `<feed><entry><title>Old topic</title><updated>2026-01-01T00:00:00Z</updated></entry></feed>`,
      "gov-atom",
    ).observations;
    const p = proposeTrend(normalizeTrends(obs)[0]!, [], { "gov-atom": "official" }, { now: NOW });
    expect(p.expired).toBe(true);
  });
  it("clusters duplicate topic titles together", () => {
    const obs = parseFeed(
      `<feed><entry><title>Cyber security advice</title><updated>2026-11-17T00:00:00Z</updated></entry>
       <entry><title>Cyber security advice for all</title><updated>2026-11-16T00:00:00Z</updated></entry></feed>`,
      "f",
    ).observations;
    expect(clusterTrends(normalizeTrends(obs)).length).toBe(1);
  });
});

// --- research integration: escalation, default-deny, deterministic replay ---
describe("research integration", () => {
  const good = base("ok", ["A consistent wake time does more for sleep than a consistent bedtime."]);
  it("escalates a high-impact category to an independent second reviewer", () => {
    expect(researchDraft(draft, good, { now: NOW }).requiresSecondReviewer).toBe(true);
  });
  it("never emits a published state (default-deny publishing)", () => {
    const card = researchDraft(draft, good, { now: NOW });
    expect(["editorial_queue", "revise", "rejected"]).toContain(card.reviewStatus);
    expect((card as unknown as Record<string, unknown>).status).toBeUndefined();
  });
  it("is deterministic and replays from cache without re-fetching", async () => {
    const spy = vi.fn(async (url: string): Promise<HttpResponse> =>
      url.endsWith("robots.txt") ? { status: 404, headers: {}, text: "" } : ok("<p>A consistent wake time does more for sleep than a fixed bedtime here.</p>"),
    );
    const store = new Map<string, RetrievalResult>();
    const cache: SourceCache = { get: (u) => store.get(u), set: (u, r) => void store.set(u, r) };
    const url = "https://ex.test/sleep";
    const r1 = await retrieveSource(url, { fetcher: spy, ua: UA, now: NOW, cache });
    const callsAfterFirst = spy.mock.calls.length;
    const r2 = await retrieveSource(url, { fetcher: spy, ua: UA, now: NOW, cache });
    expect(r2).toEqual(r1); // replay
    expect(spy.mock.calls.length).toBe(callsAfterFirst); // no re-fetch
  });
});

const _types: SourceClass = "official"; // type import smoke
void _types;
