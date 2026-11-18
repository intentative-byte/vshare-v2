/**
 * Minimal HTTP client for the live source/trend adapters.
 *
 * The adapters take an injected `HttpFetcher`, so all behaviour (failures,
 * timeouts, rate limits, missing headers) is tested offline and deterministically
 * with fakes. The real fetcher uses Node's global fetch through the configured
 * egress proxy, with a timeout and a non-identifying User-Agent (no personal
 * data is ever sent).
 */

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  text: string;
}

/** Thrown for transport-level problems the adapter classifies (timeout/network). */
export class HttpError extends Error {
  constructor(
    message: string,
    readonly kind: "timeout" | "network",
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export interface HttpFetcher {
  (url: string, opts?: { timeoutMs?: number }): Promise<HttpResponse>;
}

export const DEFAULT_USER_AGENT = "VSHARES-ContentFactory/0.1 (+educational source verification)";

/** A real fetcher. Not used in unit tests (those inject a fake). */
export function createHttpFetcher(userAgent = DEFAULT_USER_AGENT): HttpFetcher {
  return async (url, opts = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "user-agent": userAgent,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
        signal: controller.signal,
      });
      const text = await res.text();
      const headers: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
      return { status: res.status, headers, text };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new HttpError(`request to ${url} timed out`, "timeout");
      }
      throw new HttpError(`network error for ${url}: ${(err as Error).message}`, "network");
    } finally {
      clearTimeout(timer);
    }
  };
}
