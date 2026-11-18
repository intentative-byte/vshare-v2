import { describe, expect, it } from "vitest";
import {
  buildEmbed,
  parseProviderUrl,
  rankMedia,
  runMediaPipeline,
  toRankerCandidate,
  verifyCandidate,
  verifyViaOEmbed,
  renderPrototype,
  searchLicensedImages,
  validateLicensedImage,
  type VideoCandidate,
} from "@/factory/media";
import { DEMO_VIDEOS, DEMO_MIXED_FEED } from "@/factory/media/fixtures";
import type { HttpFetcher, HttpResponse } from "@/factory/live";
import type { LearnerContext } from "@/modules/vai";

const vid = (over: Partial<VideoCandidate> = {}): VideoCandidate => ({
  kind: "video",
  provider: "youtube",
  providerId: "aircAruvnKk",
  originalUrl: "https://www.youtube.com/watch?v=aircAruvnKk",
  channel: "3Blue1Brown",
  title: "But what is a neural network?",
  category: "technology-and-ai",
  topic: "ai-foundations",
  objective: "Understand what a neural network represents.",
  level: "intermediate",
  embeddable: true,
  liveVerified: "not_verified",
  reviewStatus: "draft",
  ...over,
});

describe("provider URL validation", () => {
  it("accepts the common YouTube and Vimeo forms", () => {
    expect(parseProviderUrl("https://www.youtube.com/watch?v=aircAruvnKk")).toEqual({ provider: "youtube", id: "aircAruvnKk" });
    expect(parseProviderUrl("https://youtu.be/aircAruvnKk")).toEqual({ provider: "youtube", id: "aircAruvnKk" });
    expect(parseProviderUrl("https://www.youtube.com/shorts/aircAruvnKk")).toEqual({ provider: "youtube", id: "aircAruvnKk" });
    expect(parseProviderUrl("https://vimeo.com/123456789")).toEqual({ provider: "vimeo", id: "123456789" });
  });
  it("rejects non-allowlisted providers and malformed ids", () => {
    expect(parseProviderUrl("https://example.com/watch?v=aircAruvnKk")).toBeNull();
    expect(parseProviderUrl("http://www.youtube.com/watch?v=aircAruvnKk")).toBeNull(); // not https
    expect(parseProviderUrl("https://www.youtube.com/watch?v=short")).toBeNull();
  });
});

describe("embedding: privacy, no autoplay, preserved controls, attribution", () => {
  it("builds a privacy-enhanced embed that never requests autoplay or strips controls", () => {
    const e = buildEmbed(vid(), { origin: "https://vshares.example", enableJsApi: true });
    expect(e.src).toContain("youtube-nocookie.com/embed/aircAruvnKk");
    expect(e.allow).not.toContain("autoplay");
    expect(e.src).not.toContain("controls=0");
    expect(e.src).toContain("cc_load_policy=1"); // captions
    expect(e.preservesProviderControls).toBe(true);
    expect(e.attribution.channel).toBe("3Blue1Brown");
    expect(e.attribution.originalUrl).toContain("youtube.com/watch?v=aircAruvnKk");
  });
  it("refuses to build an embed for an invalid provider id", () => {
    expect(() => buildEmbed(vid({ providerId: "bad" }))).toThrow(/invalid/);
  });
});

describe("candidate verification (completeness + attribution)", () => {
  it("passes a complete candidate", () => {
    expect(verifyCandidate(vid())).toEqual([]);
  });
  it("flags missing attribution, objective and embedding eligibility", () => {
    const issues = verifyCandidate(vid({ channel: "", objective: "too short", embeddable: false }));
    const fields = issues.map((i) => i.field);
    expect(fields).toContain("channel");
    expect(fields).toContain("objective");
    expect(fields).toContain("embeddable");
  });
  it("flags a mismatched original URL", () => {
    expect(verifyCandidate(vid({ originalUrl: "https://www.youtube.com/watch?v=WUvTyaaNkzM" })).some((i) => i.field === "originalUrl")).toBe(true);
  });
});

describe("review pipeline: no auto-approval, default-deny writes, escalation", () => {
  it("validates complete candidates to in_review and rejects invalid ones — never approves", () => {
    const r = runMediaPipeline([vid(), vid({ providerId: "bad", originalUrl: "https://x" })]);
    expect(r.summary.validated).toBe(1);
    expect(r.summary.rejected).toBe(1);
    for (const rev of r.reviews) expect(rev.candidate.reviewStatus).not.toBe("approved");
  });
  it("refuses any attempt to attach a publisher/writer", () => {
    expect(() => runMediaPipeline([vid()], { publisher: {} })).toThrow(/read-only|not permitted/i);
  });
  it("escalates a high-impact topic to an independent second reviewer", () => {
    const r = runMediaPipeline([vid({ category: "personal-finance", topic: "budgeting" })]);
    expect(r.reviews[0]?.candidate.safety?.requiresSecondReviewer).toBe(true);
  });
  it("never fact-checks the video content automatically", () => {
    const r = runMediaPipeline([vid()]);
    expect(r.reviews[0]?.candidate.quality?.reasons.join(" ")).toMatch(/not yet fact-checked/i);
  });
});

describe("VAI ranking never uses popularity", () => {
  const ctx: LearnerContext = {
    declaredTopicIds: ["ai-foundations"],
    affinityByTopic: {},
    levelByTopic: {},
    impressionsByContent: {},
    recentSourceNames: [],
    preferredMinutes: 10,
    personalisationEnabled: true,
    now: Date.parse("2026-11-18T00:00:00Z"),
  };
  it("maps every candidate to zero platform stats", () => {
    expect(toRankerCandidate(vid(), ctx.now).stats).toEqual({ impressions: 0, completions: 0 });
  });
  it("ranks a higher-quality video above a lower-quality one on the same topic", () => {
    const ranked = rankMedia(
      [vid({ providerId: "aaaaaaaaaaa", quality: { score: 40, reasons: [] } }), vid({ providerId: "bbbbbbbbbbb", quality: { score: 90, reasons: [] } })],
      ctx,
    );
    expect(ranked[0]?.candidate.providerId).toBe("bbbbbbbbbbb");
  });
});

describe("live oEmbed verification (fake fetcher)", () => {
  const f = (routes: Record<string, () => Promise<HttpResponse>>): HttpFetcher => async (url) => (routes[url] ?? (async () => ({ status: 404, headers: {}, text: "" })))();
  const oe = (id: string) => `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`;
  it("returns verified with real title and author on 200", async () => {
    const fetcher = f({ [oe("aircAruvnKk")]: async () => ({ status: 200, headers: {}, text: JSON.stringify({ title: "But what is a neural network?", author_name: "3Blue1Brown" }) }) });
    const r = await verifyViaOEmbed(fetcher, "youtube", "aircAruvnKk");
    expect(r.status).toBe("verified");
    expect(r.author).toBe("3Blue1Brown");
  });
  it("maps 404 to not_found and 401 to not_embeddable", async () => {
    expect((await verifyViaOEmbed(f({ [oe("x0x0x0x0x0x")]: async () => ({ status: 404, headers: {}, text: "" }) }), "youtube", "x0x0x0x0x0x")).status).toBe("not_found");
    expect((await verifyViaOEmbed(f({ [oe("y0y0y0y0y0y")]: async () => ({ status: 401, headers: {}, text: "" }) }), "youtube", "y0y0y0y0y0y")).status).toBe("not_embeddable");
  });
});

describe("feed prototype is accessible and safe by construction", () => {
  const html = renderPrototype(DEMO_MIXED_FEED, { origin: "https://vshares.example" });
  it("never requests autoplay and uses the privacy-enhanced host", () => {
    expect(html).not.toMatch(/autoplay=1|allow="[^"]*autoplay/);
    expect(html).toContain("youtube-nocookie.com/embed/");
  });
  it("is a keyboard-navigable feed with titled iframes and attribution", () => {
    expect(html).toContain('role="feed"');
    expect(html).toContain("ArrowDown");
    expect(html).toMatch(/<iframe[^>]+title=/);
    expect(html).toContain("Watch on youtube");
  });
  it("respects reduced motion and pauses inactive videos", () => {
    expect(html).toContain("prefers-reduced-motion");
    expect(html).toContain("pauseVideo");
    expect(html).toContain("saveData");
  });
});

describe("licensed-image adapter (reuse rights enforced)", () => {
  const f = (text: string, status = 200): HttpFetcher => async () => ({ status, headers: {}, text });
  it("accepts a clearly-licensed image with attribution", async () => {
    const r = await searchLicensedImages(
      f(JSON.stringify({ results: [{ title: "Compound interest", url: "https://img.test/a.jpg", creator: "Jane Doe", license: "by", license_version: "4.0", provider: "wikimedia" }] })),
      "compound interest",
    );
    expect(r.status).toBe("ok");
    expect(r.accepted).toHaveLength(1);
    expect(r.accepted[0]?.licence).toBe("by");
    expect(r.accepted[0]?.attribution).toContain("Jane Doe");
  });
  it("rejects an image with no licence and one with a non-reusable licence", async () => {
    const r = await searchLicensedImages(
      f(JSON.stringify({ results: [{ title: "No licence", url: "https://img.test/b.jpg", creator: "x" }, { title: "NC only", url: "https://img.test/c.jpg", creator: "y", license: "by-nc" }] })),
      "q",
    );
    expect(r.accepted).toHaveLength(0);
    expect(r.rejected.map((x) => x.reason).join(" ")).toMatch(/unclear|not on the reusable allowlist/);
  });
  it("validateLicensedImage rejects a missing creator even with a good licence", () => {
    expect(validateLicensedImage({ url: "https://img.test/d.jpg", license: "cc0" }).ok).toBe(false);
  });
  it("records an http error without inventing images", async () => {
    expect((await searchLicensedImages(f("", 503), "q")).status).toBe("http_error");
  });
});

describe("fixtures are internally valid", () => {
  it("every demo video passes verification and is a real provider URL", () => {
    for (const v of DEMO_VIDEOS) {
      expect(verifyCandidate(v)).toEqual([]);
      expect(parseProviderUrl(v.originalUrl)?.id).toBe(v.providerId);
    }
  });
});
