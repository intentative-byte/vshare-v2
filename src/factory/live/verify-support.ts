/**
 * Improved claim-support classification (Phase 10.13 T4b).
 *
 * This REPLACES NOTHING: `verifyClaims` is kept as-is for the rubric. This adds a
 * richer, honest classification of how a retrieved passage relates to a claim,
 * for the review packs. Its guiding rule: **textual similarity is not factual
 * truth.** Every result is explicitly textual-only, carries the traceable
 * passage and an uncertainty note, and NEVER confers editorial approval
 * (`confersApproval` is always false). A human decides.
 *
 * Five classes, as required:
 *   exact_support        — a supplied quote found verbatim, or very high raw
 *                          token overlap with matching numbers/dates.
 *   semantic_support     — high overlap only after light lemmatisation (a likely
 *                          accurate paraphrase); heuristic, flagged uncertain.
 *   partial_support      — moderate overlap, or a numeric/date the passage does
 *                          not confirm; on-topic but a human must check.
 *   contradiction        — negation polarity mismatch, or a conflicting
 *                          number/date, at meaningful overlap.
 *   insufficient_evidence— no passage overlaps the claim enough to say anything.
 */

export type SupportClass =
  | "exact_support"
  | "semantic_support"
  | "partial_support"
  | "contradiction"
  | "insufficient_evidence";

export interface SupportFlags {
  negationMismatch: boolean;
  numericConflict: boolean;
  numericUnconfirmed: boolean;
  dateConflict: boolean;
  dateUnconfirmed: boolean;
}

export interface SupportResult {
  supportClass: SupportClass;
  /** The best-matching retrieved passage, when any overlap was found. */
  passage?: string;
  /** Raw token overlap, 0..1. */
  rawOverlap: number;
  /** Overlap after light lemmatisation, 0..1. */
  lemmatisedOverlap: number;
  flags: SupportFlags;
  note: string;
  /** Always true: this is textual, not a judgment of factual truth. */
  textualOnly: true;
  /** Always false: automated classification never approves anything. */
  confersApproval: false;
}

export const SUPPORT_HIGH = 0.85;
export const SUPPORT_MIN = 0.6;

const STOPWORDS = new Set(
  "the a an of for to in on and or is are be been being it its that this these those you your they their them with without as at by from into about over under more most less than then so not no never can cannot do does did done have has had will would shall should could may might must one than its it's".split(
    /\s+/,
  ),
);
const NEGATIONS = ["not", "no", "never", "cannot", "cant", "isnt", "arent", "doesnt", "dont", "without", "none", "neither", "nor"];
const NUMBER_WORDS: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** Very light stemmer: strips a few common endings so paraphrases line up. */
function stem(word: string): string {
  let w = word;
  for (const suffix of ["ingly", "edly", "ing", "edly", "ies", "ied", "ed", "es", "ly", "s"]) {
    if (w.length > suffix.length + 2 && w.endsWith(suffix)) {
      w = w.slice(0, -suffix.length);
      break;
    }
  }
  return w;
}

function contentTokens(text: string, lemmatise: boolean): string[] {
  const words = normalize(text)
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return lemmatise ? words.map(stem) : words;
}

function overlap(claimTokens: string[], passageTokens: Set<string>): number {
  if (claimTokens.length === 0) return 0;
  let hit = 0;
  for (const t of claimTokens) if (passageTokens.has(t)) hit += 1;
  return hit / claimTokens.length;
}

function numbers(text: string): string[] {
  const out: string[] = [];
  const n = normalize(text);
  for (const m of n.matchAll(/\b\d{1,3}(?:[ ,]?\d{3})*(?:\.\d+)?\b/g)) {
    out.push(m[0].replace(/[ ,]/g, ""));
  }
  for (const [word, digit] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(n)) out.push(digit);
  }
  return out.filter((v) => !/^(19|20)\d{2}$/.test(v)); // years handled separately
}

function years(text: string): string[] {
  return [...normalize(text).matchAll(/\b(19|20)\d{2}\b/g)].map((m) => m[0]);
}

function hasNegation(text: string): boolean {
  const n = ` ${normalize(text).replace(/'/g, "")} `;
  return NEGATIONS.some((w) => n.includes(` ${w} `));
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * The top passages from the source, ranked by lemmatised overlap with the claim.
 * Returns REAL excerpts (never invented) so a human reviewer can read the actual
 * evidence for themselves. Pure and deterministic.
 */
export function topPassages(claim: string, passages: string[], limit = 2): Array<{ passage: string; overlap: number }> {
  const lemClaim = contentTokens(claim, true);
  return passages
    .map((p) => ({ passage: p, overlap: round(overlap(lemClaim, new Set(contentTokens(p, true)))) }))
    .filter((r) => r.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit);
}

/**
 * Classify how the retrieved passages support a claim. Pure and deterministic.
 * `passages` are the ACTUAL passages from the retrieved source.
 */
export function classifyClaimSupport(claim: string, passages: string[]): SupportResult {
  const flagsDefault: SupportFlags = {
    negationMismatch: false,
    numericConflict: false,
    numericUnconfirmed: false,
    dateConflict: false,
    dateUnconfirmed: false,
  };
  const base = { textualOnly: true as const, confersApproval: false as const };

  if (passages.length === 0) {
    return {
      supportClass: "insufficient_evidence",
      rawOverlap: 0,
      lemmatisedOverlap: 0,
      flags: flagsDefault,
      note: "no source passages were available to compare against",
      ...base,
    };
  }

  const rawClaim = contentTokens(claim, false);
  const lemClaim = contentTokens(claim, true);

  let best = { lem: 0, raw: 0, passage: "" };
  for (const p of passages) {
    const lemSet = new Set(contentTokens(p, true));
    const rawSet = new Set(contentTokens(p, false));
    const lem = overlap(lemClaim, lemSet);
    if (lem > best.lem) best = { lem, raw: overlap(rawClaim, rawSet), passage: p };
  }

  const uncertainty =
    "Textual support only — not a judgment of factual truth, and it confers no editorial approval. A human must confirm.";

  if (best.lem < SUPPORT_MIN) {
    return {
      supportClass: "insufficient_evidence",
      passage: best.passage || undefined,
      rawOverlap: round(best.raw),
      lemmatisedOverlap: round(best.lem),
      flags: flagsDefault,
      note: `no passage overlaps the claim enough (best ${round(best.lem)}). ${uncertainty}`,
      ...base,
    };
  }

  const claimNums = numbers(claim);
  const passNums = numbers(best.passage);
  const claimYears = years(claim);
  const passYears = years(best.passage);

  const numericConflict = claimNums.length > 0 && passNums.length > 0 && !claimNums.some((n) => passNums.includes(n));
  const numericUnconfirmed = claimNums.length > 0 && !numericConflict && !claimNums.every((n) => passNums.includes(n));
  const dateConflict = claimYears.length > 0 && passYears.length > 0 && !claimYears.some((y) => passYears.includes(y));
  const dateUnconfirmed = claimYears.length > 0 && !dateConflict && !claimYears.every((y) => passYears.includes(y));
  const negationMismatch = hasNegation(claim) !== hasNegation(best.passage);

  const flags: SupportFlags = { negationMismatch, numericConflict, numericUnconfirmed, dateConflict, dateUnconfirmed };

  if (negationMismatch || numericConflict || dateConflict) {
    const why = [
      negationMismatch ? "negation polarity differs" : "",
      numericConflict ? "a number in the claim conflicts with the passage" : "",
      dateConflict ? "a date in the claim conflicts with the passage" : "",
    ]
      .filter(Boolean)
      .join("; ");
    return {
      supportClass: "contradiction",
      passage: best.passage,
      rawOverlap: round(best.raw),
      lemmatisedOverlap: round(best.lem),
      flags,
      note: `high overlap but ${why}. ${uncertainty}`,
      ...base,
    };
  }

  if (numericUnconfirmed || dateUnconfirmed) {
    return {
      supportClass: "partial_support",
      passage: best.passage,
      rawOverlap: round(best.raw),
      lemmatisedOverlap: round(best.lem),
      flags,
      note: `on-topic, but a ${numericUnconfirmed ? "number" : "date"} in the claim is not confirmed by the passage. ${uncertainty}`,
      ...base,
    };
  }

  if (best.raw >= SUPPORT_HIGH) {
    return {
      supportClass: "exact_support",
      passage: best.passage,
      rawOverlap: round(best.raw),
      lemmatisedOverlap: round(best.lem),
      flags,
      note: `the passage closely matches the claim's wording. ${uncertainty}`,
      ...base,
    };
  }

  if (best.lem >= SUPPORT_HIGH) {
    return {
      supportClass: "semantic_support",
      passage: best.passage,
      rawOverlap: round(best.raw),
      lemmatisedOverlap: round(best.lem),
      flags,
      note: `a likely paraphrase (matches after lemmatisation). Heuristic. ${uncertainty}`,
      ...base,
    };
  }

  return {
    supportClass: "partial_support",
    passage: best.passage,
    rawOverlap: round(best.raw),
    lemmatisedOverlap: round(best.lem),
    flags,
    note: `the passage partly overlaps the claim (${round(best.lem)}). ${uncertainty}`,
    ...base,
  };
}
