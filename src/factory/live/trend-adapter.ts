/**
 * Live TAI trend adapter: read a permitted Atom/RSS feed into real, timestamped
 * observations with preserved provenance (feed id + entry link/id).
 *
 * Entries without a parseable timestamp are SKIPPED and counted, never given a
 * fabricated time. Fetch/parse failures are reported, not hidden.
 */
import type { SourceClass, TrendObservation, TrendSourceAdapter } from "../types";
import type { HttpFetcher } from "./http";
import { HttpError } from "./http";

function decodeTitle(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(block: string, tags: string[]): string | undefined {
  for (const tag of tags) {
    const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
    if (m?.[1]) return m[1].trim();
  }
  return undefined;
}

export interface FeedParseResult {
  observations: TrendObservation[];
  entriesSeen: number;
  skippedNoTimestamp: number;
}

export function parseFeed(xml: string, feedId: string): FeedParseResult {
  const blocks = [...xml.matchAll(/<(entry|item)\b[\s\S]*?<\/\1>/gi)].map((m) => m[0]);
  const observations: TrendObservation[] = [];
  let skipped = 0;

  blocks.forEach((block, i) => {
    const titleRaw = firstMatch(block, ["title"]);
    const dateRaw = firstMatch(block, ["updated", "published", "pubDate", "dc:date"]);
    const idRaw = firstMatch(block, ["id", "guid"]);
    const title = titleRaw ? decodeTitle(titleRaw) : "";
    if (!title) return;

    if (!dateRaw) {
      skipped += 1;
      return;
    }
    const date = new Date(dateRaw.trim());
    if (Number.isNaN(date.getTime())) {
      skipped += 1;
      return;
    }

    observations.push({
      id: `${feedId}:${idRaw ? decodeTitle(idRaw).slice(0, 80) : i}`,
      term: title,
      sourceId: feedId,
      observedAt: date.toISOString(),
      signal: 1,
    });
  });

  return { observations, entriesSeen: blocks.length, skippedNoTimestamp: skipped };
}

export interface FeedFetchResult extends FeedParseResult {
  feedId: string;
  url: string;
  status: "ok" | "http_error" | "timeout" | "network_error";
  httpStatus?: number;
  error?: string;
}

export async function fetchFeed(
  fetcher: HttpFetcher,
  feed: { id: string; url: string },
  timeoutMs = 15000,
): Promise<FeedFetchResult> {
  let res;
  try {
    res = await fetcher(feed.url, { timeoutMs });
  } catch (err) {
    const status = err instanceof HttpError && err.kind === "timeout" ? "timeout" : "network_error";
    return { feedId: feed.id, url: feed.url, status, observations: [], entriesSeen: 0, skippedNoTimestamp: 0, error: (err as Error).message };
  }
  if (res.status >= 400) {
    return { feedId: feed.id, url: feed.url, status: "http_error", httpStatus: res.status, observations: [], entriesSeen: 0, skippedNoTimestamp: 0, error: `http ${res.status}` };
  }
  const parsed = parseFeed(res.text, feed.id);
  return { feedId: feed.id, url: feed.url, status: "ok", httpStatus: res.status, ...parsed };
}

/** Wrap a feed as a TrendSourceAdapter for runTai. Fetch failure ⇒ no observations. */
export function feedAdapter(fetcher: HttpFetcher, feed: { id: string; url: string }, sourceClass: SourceClass): TrendSourceAdapter {
  return {
    id: feed.id,
    sourceClass,
    fetch: async () => (await fetchFeed(fetcher, feed)).observations,
  };
}
