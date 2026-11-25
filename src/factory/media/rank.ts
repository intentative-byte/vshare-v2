/**
 * VAI ranking for approved multimedia.
 *
 * Maps a media candidate into the EXISTING VAI ranker's Candidate shape and
 * calls the real ranker — so multimedia is ranked by educational value
 * (quality), relevance (declared/learned topic affinity), level fit, format
 * preference, freshness and source diversity. Crucially, platform stats are set
 * to zero: the ranker is never told a view/like count, so popularity cannot
 * stand in for educational quality.
 */
import { rankCandidates, type Candidate, type LearnerContext, type RankingConfig } from "@/modules/vai";
import type { VideoCandidate } from "./types";

/** A sensible default config (mirrors the shape of the active v2 config). */
export const MEDIA_RANKING_CONFIG: RankingConfig = {
  version: 2,
  weights: {
    declaredInterest: 0.18,
    learnedAffinity: 0.14,
    quality: 0.22,
    levelFit: 0.12,
    engagementQuality: 0,
    freshness: 0.1,
    timeFit: 0.1,
    formatFit: 0.14,
  },
  params: {
    sessionSize: 7,
    repeatWindowHours: 24,
    impressionPenalty: 0.1,
    impressionPenaltyCap: 0.3,
    sameSourcePenalty: 0.15, // diversity across channels
    engagementPriorImpressions: 5,
    engagementPriorRate: 0.3,
    freshnessHalfLifeDays: 120,
    maxConsecutiveSameTopic: 2,
    maxPerSource: 2,
    discoveryPosition: 3,
    levelStepUpCompletions: 3,
    confidenceK: 8,
  },
};

export function toRankerCandidate(c: VideoCandidate, now: number): Candidate {
  return {
    contentId: c.providerId,
    topicId: c.topic,
    secondaryTopicIds: [],
    sourceName: c.channel,
    qualityScore: c.quality?.score ?? 50,
    level: c.level,
    estimatedMinutes: c.durationSeconds ? Math.max(1, Math.round(c.durationSeconds / 60)) : 10,
    // Unknown real publish date ⇒ neutral (equal for all), so freshness does not
    // invent a recency advantage.
    publishedAt: new Date(now).toISOString(),
    format: "video",
    // Zero, never a made-up number: popularity is not a ranking input.
    stats: { impressions: 0, completions: 0 },
  };
}

export interface RankedMedia {
  candidate: VideoCandidate;
  score: number;
}

export function rankMedia(candidates: VideoCandidate[], context: LearnerContext): RankedMedia[] {
  const byId = new Map(candidates.map((c) => [c.providerId, c] as const));
  const mapped = candidates.map((c) => toRankerCandidate(c, context.now));
  const scored = rankCandidates(mapped, context, MEDIA_RANKING_CONFIG);
  return scored.map((s) => ({ candidate: byId.get(s.candidate.contentId)!, score: s.score }));
}
