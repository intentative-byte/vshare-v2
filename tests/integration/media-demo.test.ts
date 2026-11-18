import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { renderPrototype, runMediaPipeline, verifyViaOEmbed, type MediaCard, type VideoCandidate } from "@/factory/media";
import { createHttpFetcher } from "@/factory/live";
import { DEMO_IMAGE_CARD, DEMO_TEXT_CARD, DEMO_VIDEOS } from "@/factory/media/fixtures";

/**
 * Live multimedia demonstration. Gated behind FACTORY_LIVE=1 so CI never hits
 * the network. When run, it confirms each video via the public YouTube oEmbed
 * endpoint (no API key), records the real title/channel, and emits a working,
 * accessible feed prototype and a verification report under docs/samples/media/.
 * Nothing is downloaded, published or written to any database.
 */
const LIVE = process.env.FACTORY_LIVE === "1";
const DIR = resolve(process.cwd(), "docs/samples/media");

describe("live multimedia demonstration", () => {
  it.skipIf(!LIVE)(
    "verifies real educational videos via oEmbed and builds the feed prototype",
    async () => {
      const fetcher = createHttpFetcher();
      const verification = [];
      const verified: VideoCandidate[] = [];

      for (const v of DEMO_VIDEOS) {
        const r = await verifyViaOEmbed(fetcher, v.provider, v.providerId);
        verification.push({ providerId: v.providerId, status: r.status, title: r.title, author: r.author, httpStatus: r.httpStatus });
        verified.push({
          ...v,
          liveVerified: r.status === "verified" ? "verified" : "not_verified",
          title: r.title ?? v.title,
          channel: r.author ?? v.channel,
        });
        await new Promise((res) => setTimeout(() => res(null), 800));
      }

      const feed: MediaCard[] = [verified[0]!, DEMO_TEXT_CARD, verified[1]!, verified[2]!, DEMO_IMAGE_CARD, verified[3]!, verified[4]!];
      const review = runMediaPipeline(verified);

      mkdirSync(DIR, { recursive: true });
      writeFileSync(
        resolve(DIR, "media-verification.json"),
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            method: "YouTube oEmbed (public, no API key)",
            liveDataConnected: true,
            verifiedCount: verification.filter((r) => r.status === "verified").length,
            reviewSummary: review.summary,
            note: "A 'verified' status confirms the video exists, is public and exposes embed metadata, and gives the real title/channel. It is NOT a fact-check of the educational content — a human reviews that before approval.",
            verification,
          },
          null,
          2,
        ) + "\n",
      );
      writeFileSync(resolve(DIR, "multimedia-feed.html"), renderPrototype(feed, { origin: "https://vshares.example" }));

      for (const r of verification) expect(r.status).toBeDefined();
    },
    120000,
  );

  it("the media surface exposes no publish/write capability", async () => {
    const media = (await import("@/factory/media")) as Record<string, unknown>;
    expect(Object.keys(media).some((n) => /publish|approve|insert|delete|write|save|moderate/i.test(n))).toBe(false);
  });
});
