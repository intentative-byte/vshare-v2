/**
 * The content-factory pipeline:
 *   RESEARCH → VERIFY → DRAFT → FACT-CHECK → GRADE → EDITORIAL QUEUE
 *
 * Local-first and default dry-run. It PREPARES a draft and its evidence for a
 * human editorial queue. It can never:
 *   - publish (no "published" status is reachable from here),
 *   - write to the database (no client is imported),
 *   - mark a claim verified without a supplied supporting quote.
 *
 * The only way a card reaches the public is a human running moderate_content
 * through the existing database gates — which this module does not touch.
 */
import type { DraftInput, FactoryCard, PipelineOptions } from "./types";
import { buildEvidence } from "./evidence";
import { detectDuplicate } from "./dedup";
import { classifySafety } from "./safety";
import { grade } from "./rubric";

const DEFAULT_REVIEW_DUE_MONTHS: Record<string, number> = {
  "personal-finance": 6,
  "technology-and-ai": 6,
  "health-and-wellbeing": 12,
  "mental-health-and-resilience": 12,
  "law-rights-and-citizenship": 12,
  "civic-and-admin": 12,
};

export interface PipelineRunResult {
  cards: FactoryCard[];
  dryRun: true;
  summary: {
    total: number;
    queued: number;
    revise: number;
    rejected: number;
    requiringFactCheck: number;
    requiringSecondReviewer: number;
  };
}

export function runPipeline(drafts: DraftInput[], options: PipelineOptions = {}): PipelineRunResult {
  // Default-deny write protection: the factory has no writer. If a caller tries
  // to attach one (a "publisher"), refuse loudly rather than silently ignore.
  if (options.publisher !== undefined) {
    throw new Error("factory pipeline is read-only: publishing/writing is not permitted");
  }

  const now = options.now ? new Date(options.now) : new Date();
  const catalogue = (options.catalogueUrls ?? []).map((url) => ({ url }));

  const cards = drafts.map((input) => buildCard(input, catalogue, now));

  const summary = {
    total: cards.length,
    queued: cards.filter((c) => c.reviewStatus === "editorial_queue").length,
    revise: cards.filter((c) => c.reviewStatus === "revise").length,
    rejected: cards.filter((c) => c.reviewStatus === "rejected").length,
    requiringFactCheck: cards.filter((c) => c.requiresFactCheck).length,
    requiringSecondReviewer: cards.filter((c) => c.safety.requiresSecondReviewer).length,
  };

  // dryRun is always true for the return shape — the factory never leaves dry-run.
  return { cards, dryRun: true, summary };
}

function buildCard(
  input: DraftInput,
  catalogue: { url: string; title?: string }[],
  now: Date,
): FactoryCard {
  const evidence = buildEvidence(input);
  const duplicate = detectDuplicate({ url: input.source.url, title: input.title }, catalogue);
  const safety = classifySafety(input);
  const quality = grade(input, evidence, duplicate, safety, now);

  const reviewStatus: FactoryCard["reviewStatus"] =
    quality.verdict === "queue" ? "editorial_queue" : quality.verdict === "revise" ? "revise" : "rejected";

  const requiresFactCheck = evidence.overall !== "verified";

  return {
    slug: input.slug,
    category: input.category,
    topic: input.topic,
    level: input.level,
    format: input.format,
    objective: input.objective,
    title: input.title,
    summary: input.summary,
    takeaways: input.takeaways,
    nextStep: input.nextStep,
    estimatedMinutes: input.estimatedMinutes,
    source: input.source,
    isAiAssisted: true,
    evidence,
    quality,
    safety,
    freshness: {
      sourceDate: input.source.sourceDate,
      reviewDueMonths: DEFAULT_REVIEW_DUE_MONTHS[input.category] ?? 18,
    },
    reviewStatus,
    requiresFactCheck,
  };
}
