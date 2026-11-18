/**
 * Duplicate detection (and the shared text-similarity used by TAI clustering).
 *
 * Mirrors the database's `source_url` UNIQUE guarantee and adds normalized-URL
 * and title-similarity checks the raw unique constraint cannot see.
 */

/** Canonicalise a URL so trivially different links to one page collapse. */
export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    // Drop common tracking params.
    const drop = [...u.searchParams.keys()].filter((k) => /^utm_|^fbclid$|^gclid$/i.test(k));
    for (const k of drop) u.searchParams.delete(k);
    let path = u.pathname.replace(/\/+$/, "");
    if (path === "") path = "/";
    const search = u.searchParams.toString();
    return `${u.host.toLowerCase()}${path}${search ? `?${search}` : ""}`;
  } catch {
    return raw.trim().toLowerCase();
  }
}

/** Tokenise for similarity: lowercase words of length >= 3. */
function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3),
  );
}

/** Jaccard similarity of two strings' token sets, 0..1. */
export function titleSimilarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

export interface DuplicateResult {
  isDuplicate: boolean;
  reason: string;
  nearestTitleSimilarity: number;
}

export interface CatalogueEntry {
  url: string;
  title?: string;
}

/** Title-similarity at or above this is treated as a near-duplicate. */
export const NEAR_DUPLICATE_THRESHOLD = 0.8;

export function detectDuplicate(
  candidate: { url: string; title?: string },
  catalogue: CatalogueEntry[],
): DuplicateResult {
  const candUrl = normalizeUrl(candidate.url);
  let nearest = 0;

  for (const entry of catalogue) {
    if (normalizeUrl(entry.url) === candUrl) {
      return {
        isDuplicate: true,
        reason: "exact or normalized source_url already in the catalogue",
        nearestTitleSimilarity: 1,
      };
    }
    if (candidate.title && entry.title) {
      const sim = titleSimilarity(candidate.title, entry.title);
      if (sim > nearest) nearest = sim;
    }
  }

  if (nearest >= NEAR_DUPLICATE_THRESHOLD) {
    return {
      isDuplicate: true,
      reason: `title is a near-duplicate (similarity ${nearest.toFixed(2)})`,
      nearestTitleSimilarity: nearest,
    };
  }
  return { isDuplicate: false, reason: "no duplicate found", nearestTitleSimilarity: nearest };
}
