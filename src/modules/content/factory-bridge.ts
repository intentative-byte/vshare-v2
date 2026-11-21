import type { z } from "zod";
import type { FactoryCard, VerificationStatus } from "@/factory/types";
import { createCardInput } from "./schemas";

/**
 * Factory → catalogue bridge.
 *
 * A pure, typed conversion from a `FactoryCard` (what the Content Factory
 * prepares) into the exact `createCardInput` the existing moderator-only
 * `create_card` path accepts. It validates against the SAME Zod schema the
 * server action uses, so the factory can never produce something the normal
 * draft-creation path would reject.
 *
 * It deliberately CANNOT set a publication status, a link-check, or any
 * approval: `createCardInput` has no such field, so a card produced here can
 * only ever enter as a draft with an unchecked link, exactly like a human
 * submission. Provenance, evidence status and educational metadata that the
 * card row does not store are preserved on the result for the review pack.
 */

export type CreateCardInput = z.infer<typeof createCardInput>;

export interface BridgeResult {
  /** True only when the input is schema-valid AND carries no blocking issue. */
  ok: boolean;
  /** The validated draft input, when the Zod schema accepted it; else null. */
  input: CreateCardInput | null;
  /** Blocking problems (invalid fields, a rubric "reject", an unresolved topic). */
  issues: string[];
  /** Non-blocking notes a human reviewer must weigh (e.g. unverified evidence). */
  warnings: string[];
  /** Preserved provenance — not all of it is stored on the card row. */
  provenance: {
    sourceUrl: string;
    publisher: string;
    author: string | null;
    retrievedAt: string | null;
    sourceDate: string | null;
  };
  /** The factory's evidence verdict, preserved for the review workflow. */
  evidenceStatus: VerificationStatus;
  /** Educational metadata not stored on the card row. */
  objective: string;
  isHighImpact: boolean;
  requiresSecondReviewer: boolean;
  qualityComposite: number;
  qualityVerdict: FactoryCard["quality"]["verdict"];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Convert a factory card into a draft-creation input.
 *
 * @param card    the prepared factory card
 * @param topicId a RESOLVED taxonomy UUID (looked up from the card's topic
 *                slug by the caller — the factory never invents one)
 */
export function toCreateCardInput(card: FactoryCard, topicId: string): BridgeResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  const provenance = {
    sourceUrl: card.source.url,
    publisher: card.source.publisher,
    author: card.source.author ?? null,
    retrievedAt: card.source.retrievedAt ?? null,
    sourceDate: card.source.sourceDate ?? null,
  };

  const evidenceStatus = card.evidence.overall;
  if (evidenceStatus !== "verified") {
    warnings.push(
      `evidence is "${evidenceStatus}" — a human must ground the unsupported claims before this is approved`,
    );
  }

  if (card.quality.verdict === "reject") {
    issues.push(`rubric verdict is "reject" (composite ${card.quality.composite}) — do not import as a draft`);
  } else if (card.quality.verdict === "revise") {
    warnings.push(`rubric verdict is "revise" (composite ${card.quality.composite}) — needs edits before approval`);
  }

  if (!UUID_RE.test(topicId)) {
    issues.push("topicId must be a resolved taxonomy UUID (the factory never invents one)");
  }

  // No status / published / link-check field exists on createCardInput, so a
  // card produced here can only enter as a draft. qualityScore is advisory.
  const raw = {
    slug: card.slug,
    topicId,
    sourceUrl: card.source.url,
    sourceName: card.source.publisher,
    ...(card.source.author ? { sourceAuthor: card.source.author } : {}),
    title: card.title,
    summary: card.summary,
    takeaways: card.takeaways,
    nextStep: card.nextStep,
    format: card.format,
    level: card.level,
    estimatedMinutes: card.estimatedMinutes,
    qualityScore: card.quality.composite,
    isAiAssisted: true,
  };

  const parsed = createCardInput.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push(`${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
  }

  return {
    ok: parsed.success && issues.length === 0,
    input: parsed.success ? parsed.data : null,
    issues,
    warnings,
    provenance,
    evidenceStatus,
    objective: card.objective,
    isHighImpact: card.safety.isHighImpact,
    requiresSecondReviewer: card.safety.requiresSecondReviewer,
    qualityComposite: card.quality.composite,
    qualityVerdict: card.quality.verdict,
  };
}
