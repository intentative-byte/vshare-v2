/**
 * The VAI ranker, version 1.
 *
 * A deterministic weighted sum. The same inputs always produce the same
 * order, which is what makes a recommendation explainable, testable and
 * comparable between configurations.
 *
 * Nothing here optimises for clicks, dwell time or session length. The
 * components measure how likely a card is to be *useful* to this person:
 * what they said they want, what they have actually finished, whether the
 * level fits, and whether the card has proved useful to others. The one
 * popularity signal is a completion rate, not a click rate, and it is
 * smoothed so a brand-new card is neither punished nor flattered.
 *
 * Every factor and its weight is documented in
 * docs/VSHARES_ARCHITECTURE.md section 6, and the weights themselves live
 * in the versioned `ranking_configs` row so a change is auditable.
 */

export type RankingWeights = {
  declaredInterest: number;
  learnedAffinity: number;
  quality: number;
  levelFit: number;
  engagementQuality: number;
  freshness: number;
  timeFit: number;
  /**
   * Added in config v2. Optional, so a v1 config (which omits it) produces
   * exactly its old behaviour: the component is computed but multiplied by a
   * zero weight, so nothing changes.
   */
  formatFit?: number;
};

export type RankingParams = {
  sessionSize: number;
  repeatWindowHours: number;
  impressionPenalty: number;
  impressionPenaltyCap: number;
  sameSourcePenalty: number;
  engagementPriorImpressions: number;
  engagementPriorRate: number;
  freshnessHalfLifeDays: number;
  maxConsecutiveSameTopic: number;
  maxPerSource: number;
  discoveryPosition: number;
  levelStepUpCompletions: number;
  /**
   * Confidence smoothing for learned affinity (config v2). When present,
   * learned affinity is scaled by observations/(observations + confidenceK),
   * so a one-action guess counts for little and a well-evidenced preference
   * counts for more. Absent (v1) means no scaling — full strength, as before.
   */
  confidenceK?: number;
};

export type RankingConfig = {
  version: number;
  weights: RankingWeights;
  params: RankingParams;
};

export type Level = "beginner" | "intermediate" | "advanced";

/** A published card as the ranker sees it. No personal data here. */
export type Candidate = {
  contentId: string;
  topicId: string;
  secondaryTopicIds: string[];
  sourceName: string;
  qualityScore: number;
  level: Level;
  estimatedMinutes: number;
  publishedAt: string;
  /** The content format (article, video, …), for the format-fit signal. */
  format?: string;
  /** Real platform counters. Zero means no data, never a made-up number. */
  stats: { impressions: number; completions: number };
};

/** What we know about the person, all of it from their own actions. */
export type LearnerContext = {
  /** Topics the person chose. */
  declaredTopicIds: string[];
  /** Topic id to affinity in [0,1], learned from completions, saves and skips. */
  affinityByTopic: Record<string, number>;
  /** Topic id to the level that fits them. */
  levelByTopic: Record<string, Level>;
  /** Topic id to how many evidence events its affinity was built from. */
  observationsByTopic?: Record<string, number>;
  /** Format name to the person's learned preference in [0,1]. */
  formatAffinity?: Record<string, number>;
  /** Content id to how many times it has been shown and not opened. */
  impressionsByContent: Record<string, number>;
  /** Sources of cards completed in the last day. */
  recentSourceNames: string[];
  /** How long the person wants a session to be. */
  preferredMinutes: number;
  /** Off means rank on the chosen topic, quality and freshness only. */
  personalisationEnabled: boolean;
  /** Fixed point for freshness, so a test is not at the mercy of the clock. */
  now: number;
};

export type ScoreComponents = Record<keyof RankingWeights, number> & {
  impressionPenalty: number;
  sameSourcePenalty: number;
  /**
   * How many impressions the engagement component was computed from.
   *
   * Not a weighted component. It is recorded so an explanation can tell the
   * difference between a measured completion rate and the prior that stands
   * in for one: with a small sample there is nothing true to say about how
   * other people got on, and the explanation must not pretend otherwise.
   */
  engagementSample: number;
};

export type ScoredCandidate = {
  candidate: Candidate;
  score: number;
  components: ScoreComponents;
};

const levelOrder: Record<Level, number> = { beginner: 0, intermediate: 1, advanced: 2 };

/** Keeps every component inside [0,1] so one cannot quietly outweigh the rest. */
function clamp01(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

/** Rounds to four places, so a score is stable across platforms. */
function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function declaredInterestComponent(candidate: Candidate, context: LearnerContext): number {
  if (context.declaredTopicIds.includes(candidate.topicId)) {
    return 1;
  }

  // A secondary match is worth half: related, but not what they asked for.
  if (candidate.secondaryTopicIds.some((id) => context.declaredTopicIds.includes(id))) {
    return 0.5;
  }

  return 0;
}

export function learnedAffinityComponent(candidate: Candidate, context: LearnerContext): number {
  // An unseen topic starts low rather than neutral, so the feed leans on
  // what the person actually chose until it has evidence of its own.
  return clamp01(context.affinityByTopic[candidate.topicId] ?? 0.2);
}

export function qualityComponent(candidate: Candidate): number {
  return clamp01(candidate.qualityScore / 100);
}

export function levelFitComponent(candidate: Candidate, context: LearnerContext): number {
  const learnerLevel = context.levelByTopic[candidate.topicId] ?? "beginner";
  const distance = Math.abs(levelOrder[candidate.level] - levelOrder[learnerLevel]);

  if (distance === 0) {
    return 1;
  }

  // One step away is a stretch or a recap; two steps is the wrong material.
  return distance === 1 ? 0.5 : 0;
}

/**
 * How often people who were shown this card went on to finish it.
 *
 * Smoothed towards the platform average with a prior, so a card with three
 * impressions and three completions does not outrank everything, and a new
 * card is not buried. With no data at all the component is exactly the
 * prior: a stated assumption, not an invented statistic.
 */
export function engagementQualityComponent(candidate: Candidate, params: RankingParams): number {
  const { impressions, completions } = candidate.stats;
  const priorWeight = params.engagementPriorImpressions;
  const priorRate = params.engagementPriorRate;

  return clamp01(
    (completions + priorRate * priorWeight) / (Math.max(0, impressions) + priorWeight),
  );
}

export function freshnessComponent(candidate: Candidate, context: LearnerContext, params: RankingParams): number {
  const ageMs = context.now - new Date(candidate.publishedAt).getTime();
  const ageDays = Math.max(0, ageMs) / 86_400_000;

  // Gentle decay: useful things stay useful. Never decisive on its own.
  return clamp01(Math.exp(-ageDays / params.freshnessHalfLifeDays));
}

export function timeFitComponent(candidate: Candidate, context: LearnerContext): number {
  const preferred = Math.max(1, context.preferredMinutes);

  if (candidate.estimatedMinutes <= preferred) {
    return 1;
  }

  // Falls to zero at four times the preferred length.
  const overrun = candidate.estimatedMinutes - preferred;
  return clamp01(1 - overrun / (preferred * 3));
}

/**
 * How well the card's format matches the person's learned preference.
 *
 * Zero when there is no preference for this format — so a new learner, or a
 * format they have never favoured, gets no boost and no spurious "you prefer
 * this format" explanation. A format they have asked for sits above zero and
 * gets a small, bounded boost. It never excludes other formats: those simply
 * do not get the boost and still rank on every other signal.
 */
export function formatFitComponent(candidate: Candidate, context: LearnerContext): number {
  if (!candidate.format || !context.formatAffinity) {
    return 0;
  }

  return clamp01(context.formatAffinity[candidate.format] ?? 0);
}

/**
 * How much to trust the learned affinity, from the evidence behind it.
 *
 * Returns 1 (full strength) when the config sets no confidenceK — that is the
 * v1 behaviour. With confidenceK set, a topic touched once counts for little
 * and one touched many times counts for more, so a weak behavioural inference
 * never overrides an explicit choice.
 */
export function affinityConfidence(
  candidate: Candidate,
  context: LearnerContext,
  params: RankingParams,
): number {
  if (params.confidenceK === undefined) {
    return 1;
  }

  const observations = context.observationsByTopic?.[candidate.topicId] ?? 0;
  return observations / (observations + params.confidenceK);
}

export function scoreCandidate(
  candidate: Candidate,
  context: LearnerContext,
  config: RankingConfig,
): ScoredCandidate {
  const { weights, params } = config;

  // With personalisation off the feed still works: it ranks on quality,
  // freshness and whatever topic the person explicitly chose, and uses
  // nothing learned about them.
  const personalised = context.personalisationEnabled;

  const components: ScoreComponents = {
    declaredInterest: declaredInterestComponent(candidate, context),
    // Learned affinity is scaled by confidence, so a weak inference stays
    // weak and an explicit declared interest always leads (v1: confidence 1).
    learnedAffinity: personalised
      ? learnedAffinityComponent(candidate, context) * affinityConfidence(candidate, context, params)
      : 0,
    quality: qualityComponent(candidate),
    levelFit: personalised ? levelFitComponent(candidate, context) : 0,
    engagementQuality: engagementQualityComponent(candidate, params),
    freshness: freshnessComponent(candidate, context, params),
    timeFit: personalised ? timeFitComponent(candidate, context) : 0,
    formatFit: personalised ? formatFitComponent(candidate, context) : 0,
    impressionPenalty: 0,
    sameSourcePenalty: 0,
    engagementSample: Math.max(0, candidate.stats.impressions),
  };

  if (personalised) {
    const seen = context.impressionsByContent[candidate.contentId] ?? 0;
    components.impressionPenalty = -Math.min(
      params.impressionPenaltyCap,
      seen * params.impressionPenalty,
    );

    if (context.recentSourceNames.includes(candidate.sourceName)) {
      components.sameSourcePenalty = -params.sameSourcePenalty;
    }
  }

  const weighted =
    weights.declaredInterest * components.declaredInterest +
    weights.learnedAffinity * components.learnedAffinity +
    weights.quality * components.quality +
    weights.levelFit * components.levelFit +
    weights.engagementQuality * components.engagementQuality +
    weights.freshness * components.freshness +
    weights.timeFit * components.timeFit +
    (weights.formatFit ?? 0) * components.formatFit;

  const score = weighted + components.impressionPenalty + components.sameSourcePenalty;

  return { candidate, score: round4(score), components };
}

/**
 * Orders candidates. Ties break on publication date and then on id, so the
 * result is total and reproducible rather than dependent on input order.
 */
export function rankCandidates(
  candidates: Candidate[],
  context: LearnerContext,
  config: RankingConfig,
): ScoredCandidate[] {
  return candidates
    .map((candidate) => scoreCandidate(candidate, context, config))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      const byDate =
        new Date(b.candidate.publishedAt).getTime() - new Date(a.candidate.publishedAt).getTime();

      if (byDate !== 0) {
        return byDate;
      }

      return a.candidate.contentId.localeCompare(b.candidate.contentId);
    });
}
