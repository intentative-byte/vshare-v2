/**
 * VSHARES Content Factory & TAI — shared types.
 *
 * Pure, framework-free, no database and no network. The factory PREPARES
 * drafts and evidence for human editorial review; it never publishes, never
 * writes to Supabase, and never marks a claim "verified" unless a supporting
 * quote was actually supplied and checked. Difficulty and format reuse the
 * database enums (content_level, content_format).
 */

export type Level = "beginner" | "intermediate" | "advanced";
export type Format = "article" | "video" | "podcast" | "course" | "tool" | "book";

/** How far a claim has actually been checked. Never upgraded without evidence. */
export type VerificationStatus = "verified" | "cited_pending_verification" | "not_verified";

export type SourceClass = "official" | "institution" | "named_expert" | "community" | "unknown";

export interface SourceCandidate {
  url: string;
  publisher: string;
  author?: string;
  /** ISO timestamp — present only if the source was actually retrieved. */
  retrievedAt?: string;
  /** ISO date the source itself was published/updated, if known. */
  sourceDate?: string;
}

export interface SourceVerdict {
  ok: boolean;
  reasons: string[];
  sourceClass: SourceClass;
}

/** A material factual claim (typically a takeaway) and its support, if any. */
export interface ClaimCheck {
  claim: string;
  /** A quote from the source supporting the claim. Absent ⇒ not verified. */
  supportingQuote?: string;
  verdict: VerificationStatus;
  note: string;
}

export interface EvidenceRecord {
  source: SourceCandidate;
  sourceVerdict: SourceVerdict;
  claims: ClaimCheck[];
  overall: VerificationStatus;
}

export interface DraftInput {
  slug: string;
  category: string;
  topic: string;
  level: Level;
  format: Format;
  objective: string;
  title: string;
  summary: string;
  takeaways: string[];
  nextStep: string;
  estimatedMinutes: number;
  source: SourceCandidate;
  /** One optional supporting quote per takeaway. Absent ⇒ that claim is not verified. */
  supportingQuotes?: (string | undefined)[];
}

export type RubricAxis =
  | "accuracy"
  | "sourceReliability"
  | "usefulness"
  | "clarity"
  | "practicalApplication"
  | "originality"
  | "safety"
  | "freshness";

export type RubricScores = Record<RubricAxis, number>;

export interface RubricResult {
  scores: RubricScores;
  reasons: Record<RubricAxis, string>;
  composite: number;
  floorBreaches: string[];
  verdict: "reject" | "revise" | "queue";
}

export interface SafetyResult {
  isHighImpact: boolean;
  requiresSecondReviewer: boolean;
  disclaimers: string[];
  riskNotes: string[];
}

export interface FactoryCard {
  slug: string;
  category: string;
  topic: string;
  level: Level;
  format: Format;
  objective: string;
  title: string;
  summary: string;
  takeaways: string[];
  nextStep: string;
  estimatedMinutes: number;
  source: SourceCandidate;
  isAiAssisted: true;
  evidence: EvidenceRecord;
  quality: RubricResult;
  safety: SafetyResult;
  freshness: { sourceDate?: string; reviewDueMonths: number };
  /** The factory only ever prepares for review. It can never publish. */
  reviewStatus: "editorial_queue" | "revise" | "rejected";
  requiresFactCheck: boolean;
}

export interface PipelineOptions {
  /** Defaults to true. The factory is local-first and never writes remotely. */
  dryRun?: boolean;
  /** Existing published source_urls, for duplicate detection. */
  catalogueUrls?: string[];
  /** Fixed clock (ISO) for deterministic output. */
  now?: string;
  /** Must be absent. Any value is rejected — the factory cannot publish/write. */
  publisher?: unknown;
}

// ---------------------------------------------------------------------------
// TAI — Trend Artificial Intelligence
// ---------------------------------------------------------------------------

export interface TrendObservation {
  id: string;
  term: string;
  sourceId: string;
  observedAt: string;
  /** A raw signal count if the source provides one; else undefined. */
  signal?: number;
}

export interface TrendSourceAdapter {
  id: string;
  sourceClass: SourceClass;
  /** Adapters may be live; the fixture adapter returns inspectable fixtures. */
  fetch(): Promise<TrendObservation[]>;
}

export interface NormalizedTrend {
  key: string;
  display: string;
  observations: TrendObservation[];
  sources: string[];
}

export interface MomentumResult {
  key: string;
  status: "ok" | "insufficient_data";
  observationCount: number;
  distinctSources: number;
  momentum?: number;
  reason: string;
}

export interface TrendClassification {
  key: string;
  category?: string;
  topic?: string;
  confidence: number;
  status: "classified" | "unclassified";
}

export interface TrendProposal {
  key: string;
  display: string;
  category?: string;
  topic?: string;
  momentum: MomentumResult;
  credibility: SourceClass | "mixed";
  educationalValue: number;
  firstSeen: string;
  lastSeen: string;
  expiresAt: string;
  expired: boolean;
  status: "proposed" | "insufficient_data" | "not_verified";
  reasons: string[];
}

export interface CoverageGap {
  category: string;
  topic: string;
  level: Level;
  deficit: number;
  essential: boolean;
}

export interface PlannedSlot {
  category: string;
  topic: string;
  level: Level;
  kind: "evergreen" | "trend";
  priority: number;
  rationale: string;
}
