/**
 * Claim verification against ACTUALLY RETRIEVED passages.
 *
 * A claim is "verified" only when a passage from the retrieved source supports
 * it: either a supplied quote is found verbatim in the source, or the claim's
 * content words overlap a passage strongly without a contradicting negation.
 * - A supplied quote not present in the source is REJECTED (possible
 *   fabrication) — never "verified".
 * - No supporting passage ⇒ "unsupported".
 * - A high-overlap passage that negates the claim ⇒ "contradictory".
 * - The source could not be retrieved ⇒ "unavailable".
 * Publisher reputation alone is never treated as verification.
 */
import type { RetrievalResult } from "./source-adapter";

export type ClaimVerdict = "verified" | "unsupported" | "contradictory" | "unavailable";

export interface ClaimToVerify {
  text: string;
  /** An optional supplied quote that MUST be found in the source to count. */
  quote?: string;
}

export interface ClaimVerification {
  claim: string;
  verdict: ClaimVerdict;
  passage?: string;
  overlap: number;
  note: string;
}

const STOPWORDS = new Set(
  "the a an of for to in on and or is are be it its that this you your they their with without as at by from into about more most than then so not no never can cannot do does done have has had will would should could may might one two".split(
    " ",
  ),
);
const NEGATIONS = ["not", "no", "never", "cannot", "can't", "isn't", "doesn't", "don't", "without"];
export const VERIFY_THRESHOLD = 0.6;

function contentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function overlapScore(claimWords: string[], passage: string): number {
  if (claimWords.length === 0) return 0;
  const p = ` ${normalize(passage)} `;
  let hit = 0;
  for (const w of claimWords) if (p.includes(` ${w} `)) hit += 1;
  return hit / claimWords.length;
}

export function verifyClaims(claims: ClaimToVerify[], retrieval: RetrievalResult): ClaimVerification[] {
  if (retrieval.status !== "ok") {
    return claims.map((c) => ({
      claim: c.text,
      verdict: "unavailable" as ClaimVerdict,
      overlap: 0,
      note: `source could not be retrieved (${retrieval.status})`,
    }));
  }

  return claims.map((c) => {
    // A supplied quote must appear verbatim (normalised) in the source.
    if (c.quote && c.quote.trim()) {
      const nq = normalize(c.quote);
      const match = retrieval.passages.find((p) => normalize(p).includes(nq));
      if (match) {
        return { claim: c.text, verdict: "verified", passage: match, overlap: 1, note: "supplied quote found verbatim in the source" };
      }
      return {
        claim: c.text,
        verdict: "unsupported",
        overlap: 0,
        note: "supplied quote NOT found in the retrieved source — rejected as unverified (possible fabrication)",
      };
    }

    const words = contentWords(c.text);
    let best = { overlap: 0, passage: "" };
    for (const p of retrieval.passages) {
      const o = overlapScore(words, p);
      if (o > best.overlap) best = { overlap: o, passage: p };
    }

    if (best.overlap < VERIFY_THRESHOLD) {
      return { claim: c.text, verdict: "unsupported", overlap: round(best.overlap), note: "no passage strongly supports the claim" };
    }

    const passageHasNeg = NEGATIONS.some((n) => ` ${normalize(best.passage)} `.includes(` ${n} `));
    const claimHasNeg = NEGATIONS.some((n) => ` ${normalize(c.text)} `.includes(` ${n} `));
    if (passageHasNeg && !claimHasNeg) {
      return { claim: c.text, verdict: "contradictory", passage: best.passage, overlap: round(best.overlap), note: "a high-overlap passage negates the claim" };
    }

    return { claim: c.text, verdict: "verified", passage: best.passage, overlap: round(best.overlap), note: "a retrieved passage supports the claim" };
  });
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
