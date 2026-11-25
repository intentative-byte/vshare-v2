import { notFound } from "next/navigation";
import { areDevToolsEnabled } from "@/platform/env";
import { PageHeader } from "@/components/ui/page-header";
import { FoundationNotice } from "@/components/ui/foundation-notice";
import { MediaFeed, type FeedItem } from "@/components/feed/media-feed";
import { buildEmbed, rankMedia } from "@/factory/media";
import { DEMO_IMAGE_CARD, DEMO_TEXT_CARD, DEMO_VIDEOS } from "@/factory/media/fixtures";
import type { LearnerContext } from "@/modules/vai";

export const metadata = { title: "Multimedia feed (prototype)" };

// Fixed reference point: freshness is neutral here (all items share a publish
// date), so a constant keeps the render pure and the order deterministic.
const RANK_NOW = Date.parse("2026-11-18T00:00:00Z");

/**
 * Development-only multimedia feed prototype.
 *
 * Never served in production (a production build answers 404, which
 * security-headers.spec.ts asserts). It renders the real, accessible MediaFeed
 * component with the five oEmbed-verified fixture videos ranked by the existing
 * VAI ranker (popularity is never an input), interleaved with a text card and a
 * licensed-image placeholder. No database, no publishing.
 */
export default function MediaFeedDevPage() {
  if (!areDevToolsEnabled()) {
    notFound();
  }

  const context: LearnerContext = {
    declaredTopicIds: ["ai-foundations", "space-basics"],
    affinityByTopic: {},
    levelByTopic: {},
    impressionsByContent: {},
    recentSourceNames: [],
    preferredMinutes: 10,
    personalisationEnabled: true,
    now: RANK_NOW,
  };

  const rankedVideos = rankMedia(DEMO_VIDEOS, context).map((r) => r.candidate);

  const videoItems: FeedItem[] = rankedVideos.map((c) => {
    const embed = buildEmbed(c, { enableJsApi: true, captions: true });
    return {
      kind: "video",
      id: c.providerId,
      src: embed.src,
      allow: embed.allow,
      title: c.title,
      channel: c.channel,
      channelUrl: c.channelUrl,
      originalUrl: c.originalUrl,
      provider: c.provider,
      objective: c.objective,
      category: c.category,
      level: c.level,
      liveVerified: c.liveVerified === "verified",
    };
  });

  const textItem: FeedItem = {
    kind: "text",
    id: "text-sleep",
    title: DEMO_TEXT_CARD.title,
    body: DEMO_TEXT_CARD.body,
    objective: DEMO_TEXT_CARD.objective,
    category: DEMO_TEXT_CARD.category,
    level: DEMO_TEXT_CARD.level,
    sourcePublisher: DEMO_TEXT_CARD.source?.publisher,
    sourceUrl: DEMO_TEXT_CARD.source?.url,
  };

  const imageItem: FeedItem = {
    kind: "image",
    id: "image-compound",
    imageUrl: DEMO_IMAGE_CARD.imageUrl,
    alt: DEMO_IMAGE_CARD.alt,
    credit: DEMO_IMAGE_CARD.credit,
    creditUrl: DEMO_IMAGE_CARD.creditUrl,
    licence: DEMO_IMAGE_CARD.licence,
    title: DEMO_IMAGE_CARD.title,
    objective: DEMO_IMAGE_CARD.objective,
    category: DEMO_IMAGE_CARD.category,
    level: DEMO_IMAGE_CARD.level,
  };

  // A mixed-format session: videos interleaved with text and an image.
  const items: FeedItem[] = [
    videoItems[0]!,
    textItem,
    videoItems[1]!,
    videoItems[2]!,
    imageItem,
    videoItems[3]!,
    videoItems[4]!,
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        eyebrow="Developer"
        title="Multimedia feed prototype"
        description="The accessible MediaFeed component, VAI-ranked, with embedded educational videos, a text card and a licensed image. Development-only."
      />
      <FoundationNotice
        className="mb-4"
        milestone="Phase 10.5"
        summary="Public delivery is approved-only: this prototype renders fixtures. Wiring the feed to published content_media is the next, owner-gated step."
      />
      <MediaFeed items={items} />
    </>
  );
}
