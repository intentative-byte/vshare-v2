/**
 * Live source adapter: retrieve a source page politely and extract
 * attributable evidence passages.
 *
 * - robots.txt is checked first and obeyed (a source we may not crawl is never
 *   fetched).
 * - transport failures are RECORDED, never papered over with invented content.
 * - timestamps are taken only from the response/markup; a missing timestamp is
 *   reported as missing, not guessed.
 * - a pluggable cache gives deterministic replay without re-hitting the network.
 */
import type { HttpFetcher } from "./http";
import { HttpError } from "./http";
import { checkRobots } from "./robots";

export type RetrievalStatus =
  | "ok"
  | "http_error"
  | "timeout"
  | "rate_limited"
  | "network_error"
  | "disallowed"
  | "robots_unavailable";

export interface RetrievalResult {
  url: string;
  status: RetrievalStatus;
  httpStatus?: number;
  retrievedAt?: string;
  sourceDate?: string;
  missingTimestamp: boolean;
  passages: string[];
  error?: string;
}

export interface SourceCache {
  get(url: string): RetrievalResult | undefined;
  set(url: string, result: RetrievalResult): void;
}

export interface RetrieveOptions {
  fetcher: HttpFetcher;
  ua: string;
  now: string;
  timeoutMs?: number;
  cache?: SourceCache;
  /** Awaited before each network call, for polite rate limiting. */
  beforeRequest?: () => Promise<void>;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&rsquo;": "'",
  "&nbsp;": " ",
};

export function extractPassages(html: string): string[] {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? " ")
    .replace(/\s+/g, " ")
    .trim();

  const seen = new Set<string>();
  const passages: string[] = [];
  for (const raw of text.split(/(?<=[.!?])\s+/)) {
    const s = raw.trim();
    if (s.length < 40 || s.length > 300) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    passages.push(s);
    if (passages.length >= 60) break;
  }
  return passages;
}

export function extractSourceDate(headers: Record<string, string>, html: string): string | undefined {
  const lastMod = headers["last-modified"];
  if (lastMod) {
    const d = new Date(lastMod);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const meta =
    html.match(/<meta[^>]+(?:article:modified_time|article:published_time)[^>]+content=["']([^"']+)["']/i) ??
    html.match(/<time[^>]+datetime=["']([^"']+)["']/i);
  if (meta?.[1]) {
    const d = new Date(meta[1]);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return undefined;
}

export async function retrieveSource(url: string, opts: RetrieveOptions): Promise<RetrievalResult> {
  if (opts.cache) {
    const hit = opts.cache.get(url);
    if (hit) return hit;
  }

  const finish = (r: RetrievalResult): RetrievalResult => {
    opts.cache?.set(url, r);
    return r;
  };

  const robots = await checkRobots(opts.fetcher, url, opts.ua);
  if (robots.decision === "disallowed") {
    return finish({ url, status: "disallowed", missingTimestamp: true, passages: [], error: robots.reason });
  }
  if (robots.decision === "unavailable") {
    return finish({ url, status: "robots_unavailable", missingTimestamp: true, passages: [], error: robots.reason });
  }

  if (opts.beforeRequest) await opts.beforeRequest();

  let res;
  try {
    res = await opts.fetcher(url, { timeoutMs: opts.timeoutMs ?? 15000 });
  } catch (err) {
    const status: RetrievalStatus = err instanceof HttpError && err.kind === "timeout" ? "timeout" : "network_error";
    return finish({ url, status, missingTimestamp: true, passages: [], error: (err as Error).message });
  }

  if (res.status === 429) {
    return finish({ url, status: "rate_limited", httpStatus: 429, missingTimestamp: true, passages: [], error: "rate limited" });
  }
  if (res.status >= 400) {
    return finish({ url, status: "http_error", httpStatus: res.status, missingTimestamp: true, passages: [], error: `http ${res.status}` });
  }

  const passages = extractPassages(res.text);
  const sourceDate = extractSourceDate(res.headers, res.text);
  return finish({
    url,
    status: "ok",
    httpStatus: res.status,
    retrievedAt: opts.now,
    sourceDate,
    missingTimestamp: sourceDate === undefined,
    passages,
  });
}
