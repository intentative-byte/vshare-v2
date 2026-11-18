import { describe, expect, it } from "vitest";
import {
  formatFitComponent,
  affinityConfidence,
  scoreCandidate,
  rankCandidates,
  type Candidate,
  type LearnerContext,
  type RankingConfig,
} from "@/modules/vai/ranker";

/**
 * The adaptive signals added in ranking configuration v2: a learned format
 * preference and confidence smoothing of learned affinity. These are the
 * ranker-side counterparts to the session-feedback acceptance tests in
 * supabase/tests/cases/240_session_feedback.sql.
 *
 * v2 weights still sum to 1.00: formatFit's 0.04 is taken from
 * engagementQuality (0.10 -> 0.08) and timeFit (0.05 -> 0.03).
 */
const v2: RankingConfig = {
  version: 2,
  weights: {
    declaredInterest: 0.3,
    learnedAffinity: 0.2,
    quality: 0.2,
    levelFit: 0.1,
    engagementQuality: 0.08,
    freshness: 0.05,
    timeFit: 0.03,
    formatFit: 0.04,
  },
  params: {
    sessionSize: 7,
    repeatWindowHours: 48,
    impressionPenalty: 0.05,
    impressionPenaltyCap: 0.15,
    sameSourcePenalty: 0.05,
    engagementPriorImpressions: 20,
    engagementPriorRate: 0.35,
    freshnessHalfLifeDays: 90,
    maxConsecutiveSameTopic: 2,
    maxPerSource: 2,
    discoveryPosition: 5,
    levelStepUpCompletions: 5,
    confidenceK: 8,
  },
};

const now = new Date("2026-11-17T12:00:00Z").getTime();

function card(overrides: Partial<Candidate> = {}): Candidate {
  return {
    contentId: "card-1",
    topicId: "topic-ai",
    secondaryTopicIds: [],
    sourceName: "Example Publisher",
    qualityScore: 50,
    level: "beginner",
    estimatedMinutes: 10,
    publishedAt: "2026-11-17T12:00:00Z",
    format: "article",
    stats: { impressions: 0, completions: 0 },
    ...overrides,
  };
}

function learner(overrides: Partial<LearnerContext> = {}): LearnerContext {
  return {
    declaredTopicIds: [],
    affinityByTopic: {},
    levelByTopic: {},
    impressionsByContent: {},
    recentSourceNames: [],
    preferredMinutes: 10,
    personalisationEnabled: true,
    now,
    ...overrides,
  };
}

describe("format preference (acceptance 3)", () => {
  it("gives a video card a boost once video is preferred, but not to a new learner", () => {
    const video = card({ contentId: "v", format: "video" });

    const newLearner = learner();
    const videoLover = learner({ formatAffinity: { video: 0.44 } });

    expect(formatFitComponent(video, newLearner)).toBe(0);
    expect(formatFitComponent(video, videoLover)).toBeGreaterThan(0);

    const asNew = scoreCandidate(video, newLearner, v2).score;
    const asLover = scoreCandidate(video, videoLover, v2).score;
    expect(asLover).toBeGreaterThan(asNew);
  });

  it("does not exclude other formats: an article still outranks a weaker video", () => {
    // The person prefers video, but a clearly better article still wins —
    // the format boost is small (weight 0.04), so it tilts, never dictates.
    const strongArticle = card({ contentId: "a", format: "article", qualityScore: 95 });
    const weakVideo = card({ contentId: "v", format: "video", qualityScore: 40 });
    const context = learner({ formatAffinity: { video: 0.6 } });

    const order = rankCandidates([weakVideo, strongArticle], context, v2).map((r) => r.candidate.contentId);
    expect(order[0]).toBe("a");
    // And the video is still in the ranking, not filtered out.
    expect(order).toContain("v");
  });

  it("tilts between otherwise-equal cards toward the preferred format", () => {
    const article = card({ contentId: "a", format: "article" });
    const video = card({ contentId: "v", format: "video" });
    const context = learner({ formatAffinity: { video: 0.7 } });

    const order = rankCandidates([article, video], context, v2).map((r) => r.candidate.contentId);
    expect(order[0]).toBe("v");
  });

  it("adds no format reason, and no score change, when personalisation is off", () => {
    const video = card({ format: "video" });
    const context = learner({ formatAffinity: { video: 0.9 }, personalisationEnabled: false });
    expect(scoreCandidate(video, context, v2).components.formatFit).toBe(0);
  });
});

describe("confidence smoothing (requirement 3, 6)", () => {
  it("counts a well-evidenced affinity more than a one-action guess", () => {
    const c = card({ topicId: "topic-ai" });

    const oneAction = learner({
      affinityByTopic: { "topic-ai": 0.8 },
      observationsByTopic: { "topic-ai": 1 },
    });
    const sustained = learner({
      affinityByTopic: { "topic-ai": 0.8 },
      observationsByTopic: { "topic-ai": 40 },
    });

    const low = scoreCandidate(c, oneAction, v2).components.learnedAffinity;
    const high = scoreCandidate(c, sustained, v2).components.learnedAffinity;
    expect(high).toBeGreaterThan(low);
    // With one action out of a K of 8, confidence is 1/9 — the guess barely counts.
    expect(low).toBeLessThan(0.2);
  });

  it("confidence is the identity when the config sets no confidenceK (v1 behaviour)", () => {
    const c = card({ topicId: "topic-ai" });
    const context = learner({ affinityByTopic: { "topic-ai": 0.8 } });
    const noK = { ...v2, params: { ...v2.params, confidenceK: undefined } };
    expect(affinityConfidence(c, context, noK.params)).toBe(1);
  });

  it("lets an explicit declared interest lead a low-confidence inferred one", () => {
    // A declared topic with no behaviour vs an inferred topic with one weak action.
    const declared = card({ contentId: "d", topicId: "topic-declared" });
    const inferred = card({ contentId: "i", topicId: "topic-inferred" });
    const context = learner({
      declaredTopicIds: ["topic-declared"],
      affinityByTopic: { "topic-inferred": 0.9 },
      observationsByTopic: { "topic-inferred": 1 },
    });

    const order = rankCandidates([inferred, declared], context, v2).map((r) => r.candidate.contentId);
    expect(order[0]).toBe("d");
  });
});

describe("cold start (acceptance 5)", () => {
  it("ranks a full batch for a brand-new learner with no history at all", () => {
    const batch = [
      card({ contentId: "a", qualityScore: 80, format: "article" }),
      card({ contentId: "b", qualityScore: 60, format: "video" }),
      card({ contentId: "c", qualityScore: 40, format: "podcast" }),
    ];
    const ranked = rankCandidates(batch, learner(), v2);
    expect(ranked).toHaveLength(3);
    // With nothing known, it leads on quality — the honest default.
    expect(ranked[0]?.candidate.contentId).toBe("a");
    // No format or affinity signal contributed.
    expect(ranked[0]?.components.formatFit).toBe(0);
    expect(ranked[0]?.components.learnedAffinity).toBe(0);
  });
});
