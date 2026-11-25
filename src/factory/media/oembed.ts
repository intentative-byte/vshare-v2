/**
 * Live media verification via public oEmbed endpoints (no API key).
 *
 * oEmbed confirms a video exists, is public and exposes embed metadata, and
 * returns the REAL title and channel for honest attribution. A non-200 is
 * recorded (not found / not embeddable / error) — never papered over. This is
 * the only "live" media integration; it uses an injected HttpFetcher so tests
 * stay offline.
 */
import type { HttpFetcher } from "../live/http";
import { HttpError } from "../live/http";
import type { MediaProvider } from "./types";
import { canonicalUrl } from "./providers";

export type OEmbedStatus = "verified" | "not_found" | "not_embeddable" | "error";

export interface OEmbedResult {
  provider: MediaProvider;
  id: string;
  status: OEmbedStatus;
  title?: string;
  author?: string;
  authorUrl?: string;
  thumbnailUrl?: string;
  httpStatus?: number;
  error?: string;
}

function endpoint(provider: MediaProvider, id: string): string {
  const url = encodeURIComponent(canonicalUrl(provider, id));
  return provider === "youtube"
    ? `https://www.youtube.com/oembed?url=${url}&format=json`
    : `https://vimeo.com/api/oembed.json?url=${url}`;
}

export async function verifyViaOEmbed(fetcher: HttpFetcher, provider: MediaProvider, id: string): Promise<OEmbedResult> {
  let res;
  try {
    res = await fetcher(endpoint(provider, id), { timeoutMs: 15000 });
  } catch (err) {
    const msg = err instanceof HttpError ? `${err.kind}` : (err as Error).message;
    return { provider, id, status: "error", error: msg };
  }
  if (res.status === 404) return { provider, id, status: "not_found", httpStatus: 404 };
  if (res.status === 401 || res.status === 403) {
    return { provider, id, status: "not_embeddable", httpStatus: res.status };
  }
  if (res.status !== 200) return { provider, id, status: "error", httpStatus: res.status, error: `http ${res.status}` };

  try {
    const data = JSON.parse(res.text) as {
      title?: string;
      author_name?: string;
      author_url?: string;
      thumbnail_url?: string;
    };
    return {
      provider,
      id,
      status: "verified",
      httpStatus: 200,
      title: data.title,
      author: data.author_name,
      authorUrl: data.author_url,
      thumbnailUrl: data.thumbnail_url,
    };
  } catch {
    return { provider, id, status: "error", httpStatus: 200, error: "invalid oEmbed JSON" };
  }
}
