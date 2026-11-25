/**
 * Pure mapping from approved content_media rows to serializable feed items.
 * Server-side only (it builds embeds); kept framework-free so it is unit-tested.
 * A row with a malformed provider id is skipped rather than crashing the feed.
 */
import { buildEmbed, type VideoCandidate } from "@/factory/media";
import type { ApprovedMediaRow } from "@/modules/feed/server";
import type { FeedItem } from "./media-feed";

export function approvedMediaToFeedItems(rows: ApprovedMediaRow[]): FeedItem[] {
  const items: FeedItem[] = [];
  for (const row of rows) {
    const objective = row.objective ?? "Approved educational media.";
    if (row.provider === "image") {
      items.push({
        kind: "image",
        id: row.id,
        imageUrl: row.original_url,
        alt: row.title,
        credit: row.channel,
        creditUrl: row.channel_url ?? undefined,
        licence: row.licence ?? "licensed",
        title: row.title,
        objective,
        category: row.media_type,
        level: "beginner",
      });
      continue;
    }
    const candidate: VideoCandidate = {
      kind: "video",
      provider: row.provider,
      providerId: row.provider_id ?? "",
      originalUrl: row.original_url,
      channel: row.channel,
      channelUrl: row.channel_url ?? undefined,
      title: row.title,
      category: row.media_type,
      topic: "",
      objective,
      level: "beginner",
      embeddable: row.embeddable,
      captionsAvailable: row.captions_available,
      liveVerified: "verified",
      reviewStatus: "approved",
    };
    try {
      const embed = buildEmbed(candidate, { enableJsApi: true, captions: true });
      items.push({
        kind: "video",
        id: row.id,
        src: embed.src,
        allow: embed.allow,
        title: row.title,
        channel: row.channel,
        channelUrl: row.channel_url ?? undefined,
        originalUrl: row.original_url,
        provider: row.provider,
        objective,
        category: row.media_type,
        level: "beginner",
        liveVerified: true,
      });
    } catch {
      // malformed provider id — skip this row, keep the feed working
    }
  }
  return items;
}
