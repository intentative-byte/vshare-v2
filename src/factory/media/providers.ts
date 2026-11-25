/**
 * Provider adapters: validate provider URLs and build privacy-respecting embeds.
 *
 * Only an allowlist of providers (YouTube, Vimeo) is accepted. Embeds use the
 * privacy-enhanced hosts (youtube-nocookie.com, Vimeo dnt=1), keep the
 * provider's own controls and branding, request captions, and never request
 * autoplay. Nothing is downloaded or rehosted.
 */
import type { EmbedSpec, MediaProvider, VideoCandidate } from "./types";

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^[0-9]{6,12}$/;

export interface ParsedProviderUrl {
  provider: MediaProvider;
  id: string;
}

export function parseProviderUrl(raw: string): ParsedProviderUrl | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.host.toLowerCase().replace(/^www\./, "");

  // YouTube
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const v = u.searchParams.get("v");
    if (v && YOUTUBE_ID.test(v)) return { provider: "youtube", id: v };
    const m = u.pathname.match(/^\/(embed|shorts|v)\/([A-Za-z0-9_-]{11})/);
    if (m) return { provider: "youtube", id: m[2]! };
    return null;
  }
  if (host === "youtu.be") {
    const id = u.pathname.slice(1, 12);
    if (YOUTUBE_ID.test(id)) return { provider: "youtube", id };
    return null;
  }

  // Vimeo
  if (host === "vimeo.com") {
    const m = u.pathname.match(/^\/(\d{6,12})/);
    if (m) return { provider: "vimeo", id: m[1]! };
    return null;
  }
  if (host === "player.vimeo.com") {
    const m = u.pathname.match(/^\/video\/(\d{6,12})/);
    if (m) return { provider: "vimeo", id: m[1]! };
    return null;
  }

  return null;
}

export function isValidProviderId(provider: MediaProvider, id: string): boolean {
  return provider === "youtube" ? YOUTUBE_ID.test(id) : VIMEO_ID.test(id);
}

/** Canonical original URL for attribution/dedup. */
export function canonicalUrl(provider: MediaProvider, id: string): string {
  return provider === "youtube" ? `https://www.youtube.com/watch?v=${id}` : `https://vimeo.com/${id}`;
}

export interface EmbedOptions {
  /** The embedding site origin, required by the YouTube iframe API. */
  origin?: string;
  /** Request the JS API so the feed can pause an inactive video. */
  enableJsApi?: boolean;
  captions?: boolean;
}

const EMBED_ALLOW = "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

export function buildEmbed(candidate: VideoCandidate, options: EmbedOptions = {}): EmbedSpec {
  if (!isValidProviderId(candidate.provider, candidate.providerId)) {
    throw new Error(`invalid ${candidate.provider} id: ${candidate.providerId}`);
  }
  const params = new URLSearchParams();
  // Preserve controls (do NOT set controls=0). Related videos limited to channel.
  params.set("rel", "0");
  params.set("playsinline", "1");
  if (options.captions !== false) params.set("cc_load_policy", "1");
  if (options.enableJsApi) params.set("enablejsapi", "1");
  if (options.origin) params.set("origin", options.origin);
  // Never autoplay by default — respects motion/data preferences and avoids
  // simultaneous playback.

  let src: string;
  if (candidate.provider === "youtube") {
    params.set("modestbranding", "1");
    src = `https://www.youtube-nocookie.com/embed/${candidate.providerId}?${params.toString()}`;
  } else {
    params.set("dnt", "1"); // Vimeo: do not track
    params.set("byline", "1"); // keep attribution
    params.set("portrait", "1");
    src = `https://player.vimeo.com/video/${candidate.providerId}?${params.toString()}`;
  }

  return {
    provider: candidate.provider,
    src,
    title: candidate.title,
    attribution: { channel: candidate.channel, originalUrl: candidate.originalUrl },
    allow: EMBED_ALLOW,
    preservesProviderControls: true,
  };
}
