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

// ---------------------------------------------------- baseline classifier ---

/**
 * A richer, non-discarding duplicate assessment for the Originals factory.
 *
 * Unlike `detectDuplicate` (a binary yes/no), this distinguishes a CERTAIN
 * collision (the normalised source URL already exists — safe to skip) from an
 * UNCERTAIN near-match (a similar or identical title on a different URL — which
 * must be surfaced to a human, never auto-discarded). A candidate is only ever
 * dropped automatically on an exact URL collision, which the database's own
 * `source_url` UNIQUE constraint would reject anyway.
 */
export type DuplicateVerdict = "unique" | "exact_duplicate" | "near_duplicate_review";

export type DuplicateSignal = "normalized_url" | "normalized_title" | "title_similarity";

export interface DuplicateMatch {
  url: string;
  title?: string;
  similarity: number;
  signal: DuplicateSignal;
}

export interface DuplicateAssessment {
  verdict: DuplicateVerdict;
  reason: string;
  /** Highest title similarity seen against the catalogue, 0..1. */
  nearest: number;
  /** Every catalogue entry that triggered the verdict, strongest first. */
  matches: DuplicateMatch[];
}

export interface ClassifyOptions {
  /** At or above this title similarity is treated as a strong near-duplicate. */
  nearThreshold?: number;
  /** At or above this title similarity is flagged for human review. */
  reviewBand?: number;
}

/** Normalise a title for equality checks: lowercase alphanumerics, single-spaced. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Turn any card-ish record into a catalogue entry for comparison. */
export function toCatalogueEntry(record: {
  source?: { url: string };
  sourceUrl?: string;
  url?: string;
  title?: string;
}): CatalogueEntry {
  const url = record.source?.url ?? record.sourceUrl ?? record.url ?? "";
  return { url, title: record.title };
}

export function classifyDuplicate(
  candidate: { url: string; title?: string },
  catalogue: CatalogueEntry[],
  options: ClassifyOptions = {},
): DuplicateAssessment {
  const nearThreshold = options.nearThreshold ?? NEAR_DUPLICATE_THRESHOLD;
  const reviewBand = options.reviewBand ?? 0.6;
  const candUrl = normalizeUrl(candidate.url);
  const candTitleNorm = candidate.title ? normalizeTitle(candidate.title) : "";

  // 1) Certain collision: the normalised URL already exists.
  const urlMatches = catalogue
    .filter((entry) => normalizeUrl(entry.url) === candUrl)
    .map<DuplicateMatch>((entry) => ({
      url: entry.url,
      title: entry.title,
      similarity: 1,
      signal: "normalized_url",
    }));
  if (urlMatches.length > 0) {
    return {
      verdict: "exact_duplicate",
      reason: "the normalised source URL already exists in the catalogue",
      nearest: 1,
      matches: urlMatches,
    };
  }

  // 2) Title signals — never auto-discarded, only flagged for a human.
  let nearest = 0;
  const titleMatches: DuplicateMatch[] = [];
  for (const entry of catalogue) {
    if (!candidate.title || !entry.title) continue;
    const identical = candTitleNorm !== "" && normalizeTitle(entry.title) === candTitleNorm;
    const similarity = identical ? 1 : titleSimilarity(candidate.title, entry.title);
    if (similarity > nearest) nearest = similarity;
    if (similarity >= reviewBand) {
      titleMatches.push({
        url: entry.url,
        title: entry.title,
        similarity,
        signal: identical ? "normalized_title" : "title_similarity",
      });
    }
  }

  if (titleMatches.length > 0) {
    titleMatches.sort((a, b) => b.similarity - a.similarity);
    const strong = nearest >= nearThreshold;
    return {
      verdict: "near_duplicate_review",
      reason: `${strong ? "strong" : "possible"} title near-duplicate (highest similarity ${nearest.toFixed(
        2,
      )}); needs human review, not auto-discarded`,
      nearest,
      matches: titleMatches,
    };
  }

  return { verdict: "unique", reason: "no duplicate found", nearest, matches: [] };
}
