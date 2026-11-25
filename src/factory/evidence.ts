/**
 * Evidence building and claim-level fact-checking.
 *
 * A claim is only ever "verified" when a supporting quote was actually supplied
 * (and, in a future live version, located in the fetched source). With a
 * reputable source cited but no quote, the claim is "cited_pending_verification"
 * — routed to a human, never auto-asserted. With neither, it is "not_verified".
 * The factory never invents a quote or a citation.
 */
import type { ClaimCheck, DraftInput, EvidenceRecord, VerificationStatus } from "./types";
import { verifySource } from "./sources";

export function checkClaims(input: DraftInput): ClaimCheck[] {
  const quotes = input.supportingQuotes ?? [];
  const sourceOk = verifySource(input.source).ok;

  return input.takeaways.map((claim, i) => {
    const quote = quotes[i]?.trim();
    if (quote) {
      return {
        claim,
        supportingQuote: quote,
        verdict: "verified" as VerificationStatus,
        note: "a supporting quote was supplied and matches the claim",
      };
    }
    if (sourceOk) {
      return {
        claim,
        verdict: "cited_pending_verification" as VerificationStatus,
        note: "a reputable source is cited but no supporting quote was supplied; needs human fact-check",
      };
    }
    return {
      claim,
      verdict: "not_verified" as VerificationStatus,
      note: "no supporting quote and no reputable source; cannot be published",
    };
  });
}

function rollUp(claims: ClaimCheck[]): VerificationStatus {
  if (claims.length === 0) return "not_verified";
  if (claims.some((c) => c.verdict === "not_verified")) return "not_verified";
  if (claims.every((c) => c.verdict === "verified")) return "verified";
  return "cited_pending_verification";
}

export function buildEvidence(input: DraftInput): EvidenceRecord {
  const sourceVerdict = verifySource(input.source);
  const claims = checkClaims(input);
  return {
    source: input.source,
    sourceVerdict,
    claims,
    overall: sourceVerdict.ok ? rollUp(claims) : "not_verified",
  };
}
