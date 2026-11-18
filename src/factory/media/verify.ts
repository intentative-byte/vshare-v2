/**
 * Candidate verification: every video candidate must carry the full record
 * before it can enter review. Missing attribution, objective, classification or
 * embedding eligibility is an issue, not something the engine invents.
 *
 * Verifying completeness is NOT the same as fact-checking the educational
 * content: a video is never marked fact-checked here — that requires a human to
 * review the actual content.
 */
import type { CandidateIssue, VideoCandidate } from "./types";
import { isValidProviderId, parseProviderUrl } from "./providers";

export function verifyCandidate(c: VideoCandidate): CandidateIssue[] {
  const issues: CandidateIssue[] = [];
  const need = (cond: boolean, field: string, message: string) => {
    if (!cond) issues.push({ field, message });
  };

  need(c.provider === "youtube" || c.provider === "vimeo", "provider", "unsupported provider");
  need(isValidProviderId(c.provider, c.providerId), "providerId", "invalid provider id");

  const parsed = parseProviderUrl(c.originalUrl);
  need(parsed !== null, "originalUrl", "original URL is not a recognised provider URL");
  if (parsed && parsed.id !== c.providerId) {
    issues.push({ field: "originalUrl", message: "original URL does not match the provider id" });
  }

  need(!!c.channel && c.channel.trim().length >= 2, "channel", "creator/channel attribution is required");
  need(!!c.title && c.title.trim().length >= 3, "title", "title is required");
  need(!!c.category, "category", "category is required");
  need(!!c.topic, "topic", "topic is required");
  need(!!c.objective && c.objective.trim().length >= 10, "objective", "a clear educational objective is required");
  need(["beginner", "intermediate", "advanced"].includes(c.level), "level", "a difficulty level is required");
  need(c.embeddable === true, "embeddable", "embedding eligibility must be confirmed before display");

  return issues;
}
