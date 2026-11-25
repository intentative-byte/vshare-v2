import { describe, expect, it } from "vitest";
import {
  engagementQualityComponent,
  freshnessComponent,
  levelFitComponent,
  rankCandidates,
  scoreCandidate,
  timeFitComponent,
  type Candidate,
  type LearnerContext,
  type RankingConfig,
} from "@/modules/vai/ranker";

const config: RankingConfig = {
  version: 1,
  weights: {
    declaredInterest: 0.3,
    learnedAffinity: 0.2,
    quality: 0.2,
    levelFit: 0.1,
    engagementQuality: 0.1,
    freshness: 0.05,
    timeFit: 0.05,
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
  },
};

const now = new Date("2026-11-14T12:00:00Z").getTime();

function card(overrides: Partial<Candidate> = {}): Candidate {
  return {
    contentId: "card-1",
    topicId: "topic-ai",
    secondaryTopicIds: [],
    sourceName: "Example Publisher",
    qualityScore: 50,
    level: "beginner",
    estimatedMinutes: 10,
    publishedAt: "2026-11-14T12:00:00Z",
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

describe("determinism", () => {
  it("gives the same score for the same inputs", () => {
    const candidate = card({ qualityScore: 73, stats: { impressions: 11, completions: 4 } });
    const context = learner({ declaredTopicIds: ["topic-ai"], affinityByTopic: { "topic-ai": 0.6 } });

    const first = scoreCandidate(candidate, context, config);
    const second = scoreCandidate(candidate, context, config);

    expect(first.score).toBe(second.score);
    expect(first.components).toEqual(second.components);
  });

  it("produces the same order whatever order the candidates arrive in", () => {
    const candidates = [
      card({ contentId: "a", qualityScore: 90 }),
      card({ contentId: "b", qualityScore: 40 }),
      card({ contentId: "c", qualityScore: 65 }),
      card({ contentId: "d", qualityScore: 65 }),
    ];
    const context = learner();

    const forwards = rankCandidates(candidates, context, config).map((r) => r.candidate.contentId);
    const backwards = rankCandidates([...candidates].reverse(), context, config).map(
      (r) => r.candidate.contentId,
    );

    expect(forwards).toEqual(backwards);
  });

  it("breaks an exact tie by publication date, then by id", () => {
    const candidates = [
      card({ contentId: "z", publishedAt: "2026-11-01T00:00:00Z" }),
      card({ contentId: "a", publishedAt: "2026-11-01T00:00:00Z" }),
      card({ contentId: "m", publishedAt: "2026-11-10T00:00:00Z" }),
    ];

    const order = rankCandidates(candidates, learner(), config).map((r) => r.candidate.contentId);

    expect(order).toEqual(["m", "a", "z"]);
  });
});

describe("declared interests carry real weight", () => {
  it("puts a chosen topic above an unchosen one of equal quality", () => {
    const chosen = card({ contentId: "chosen", topicId: "topic-ai" });
    const other = card({ contentId: "other", topicId: "topic-finance" });
    const context = learner({ declaredTopicIds: ["topic-ai"] });

    const order = rankCandidates([other, chosen], context, config).map((r) => r.candidate.contentId);

    expect(order[0]).toBe("chosen");
  });

  it("counts a secondary topic for half", () => {
    const context = learner({ declaredTopicIds: ["topic-ai"] });

    const primary = scoreCandidate(card({ topicId: "topic-ai" }), context, config);
    const secondary = scoreCandidate(
      card({ topicId: "topic-other", secondaryTopicIds: ["topic-ai"] }),
      context,
      config,
    );
    const unrelated = scoreCandidate(card({ topicId: "topic-other" }), context, config);

    expect(primary.components.declaredInterest).toBe(1);
    expect(secondary.components.declaredInterest).toBe(0.5);
    expect(unrelated.components.declaredInterest).toBe(0);
  });

  it("cannot be outweighed by quality alone", () => {
    const chosenAverage = card({ contentId: "chosen", topicId: "topic-ai", qualityScore: 50 });
    const unchosenExcellent = card({ contentId: "other", topicId: "topic-x", qualityScore: 100 });
    const context = learner({ declaredTopicIds: ["topic-ai"] });

    const order = rankCandidates([unchosenExcellent, chosenAverage], context, config).map(
      (r) => r.candidate.contentId,
    );

    expect(order[0]).toBe("chosen");
  });
});

describe("quality matters", () => {
  it("ranks a better-reviewed card above a worse one, all else equal", () => {
    const good = card({ contentId: "good", qualityScore: 90 });
    const poor = card({ contentId: "poor", qualityScore: 20 });

    const order = rankCandidates([poor, good], learner(), config).map((r) => r.candidate.contentId);

    expect(order).toEqual(["good", "poor"]);
  });
});

describe("level fit", () => {
  it("prefers the level the person is working at", () => {
    const context = learner({ levelByTopic: { "topic-ai": "intermediate" } });

    expect(levelFitComponent(card({ level: "intermediate" }), context)).toBe(1);
    expect(levelFitComponent(card({ level: "beginner" }), context)).toBe(0.5);
    expect(levelFitComponent(card({ level: "advanced" }), context)).toBe(0.5);
  });

  it("scores two steps away at zero", () => {
    const context = learner({ levelByTopic: { "topic-ai": "beginner" } });

    expect(levelFitComponent(card({ level: "advanced" }), context)).toBe(0);
  });

  it("assumes beginner when nothing is known", () => {
    expect(levelFitComponent(card({ level: "beginner" }), learner())).toBe(1);
  });
});

describe("engagement quality uses real counters only", () => {
  it("is exactly the prior when a card has no history", () => {
    expect(engagementQualityComponent(card(), config.params)).toBeCloseTo(0.35, 5);
  });

  it("is pulled towards the prior when the sample is tiny", () => {
    const threeOfThree = engagementQualityComponent(
      card({ stats: { impressions: 3, completions: 3 } }),
      config.params,
    );

    expect(threeOfThree).toBeGreaterThan(0.35);
    expect(threeOfThree).toBeLessThan(0.6);
  });

  it("approaches the real rate once there is enough data", () => {
    const observed = engagementQualityComponent(
      card({ stats: { impressions: 2000, completions: 1600 } }),
      config.params,
    );

    expect(observed).toBeGreaterThan(0.78);
    expect(observed).toBeLessThan(0.81);
  });

  it("never exceeds one or falls below zero", () => {
    expect(
      engagementQualityComponent(card({ stats: { impressions: 1, completions: 50 } }), config.params),
    ).toBeLessThanOrEqual(1);
    expect(
      engagementQualityComponent(card({ stats: { impressions: 100, completions: 0 } }), config.params),
    ).toBeGreaterThanOrEqual(0);
  });
});

describe("freshness and time fit", () => {
  it("decays gently with age and never dominates", () => {
    const context = learner();
    const today = freshnessComponent(card(), context, config.params);
    const quarter = freshnessComponent(
      card({ publishedAt: "2026-08-16T12:00:00Z" }),
      context,
      config.params,
    );

    expect(today).toBeCloseTo(1, 3);
    expect(quarter).toBeLessThan(0.4);
    expect(quarter).toBeGreaterThan(0.3);
    // Its weight is small enough that it cannot reorder on its own.
    expect(config.weights.freshness).toBeLessThanOrEqual(0.05);
  });

  it("is full marks for anything inside the time the person set aside", () => {
    const context = learner({ preferredMinutes: 10 });

    expect(timeFitComponent(card({ estimatedMinutes: 4 }), context)).toBe(1);
    expect(timeFitComponent(card({ estimatedMinutes: 10 }), context)).toBe(1);
    expect(timeFitComponent(card({ estimatedMinutes: 20 }), context)).toBeCloseTo(0.667, 2);
    expect(timeFitComponent(card({ estimatedMinutes: 40 }), context)).toBe(0);
  });
});

describe("repetition", () => {
  it("lowers a card that has been shown and not opened", () => {
    const context = learner({ impressionsByContent: { "card-1": 2 } });
    const seen = scoreCandidate(card(), context, config);
    const unseen = scoreCandidate(card(), learner(), config);

    expect(seen.components.impressionPenalty).toBeCloseTo(-0.1, 5);
    expect(seen.score).toBeLessThan(unseen.score);
  });

  it("caps the penalty, so an old card is never buried for ever", () => {
    const context = learner({ impressionsByContent: { "card-1": 50 } });

    expect(scoreCandidate(card(), context, config).components.impressionPenalty).toBeCloseTo(
      -0.15,
      5,
    );
  });

  it("lowers a card from a source just read", () => {
    const context = learner({ recentSourceNames: ["Example Publisher"] });

    expect(scoreCandidate(card(), context, config).components.sameSourcePenalty).toBeCloseTo(
      -0.05,
      5,
    );
  });
});

describe("a new user still gets a useful feed", () => {
  it("ranks on quality, engagement and freshness when nothing is known", () => {
    const context = learner();
    const candidates = [
      card({ contentId: "weak", qualityScore: 30, publishedAt: "2025-01-01T00:00:00Z" }),
      card({ contentId: "strong", qualityScore: 95 }),
      card({ contentId: "middling", qualityScore: 60 }),
    ];

    const order = rankCandidates(candidates, context, config).map((r) => r.candidate.contentId);

    expect(order).toEqual(["strong", "middling", "weak"]);
  });

  it("scores every candidate above zero, so a cold feed is never empty", () => {
    const scored = rankCandidates([card({ qualityScore: 0 })], learner(), config);

    expect(scored[0]!.score).toBeGreaterThan(0);
  });
});

describe("personalisation can be switched off", () => {
  it("ignores everything learned about the person", () => {
    const context = learner({
      personalisationEnabled: false,
      affinityByTopic: { "topic-ai": 1 },
      levelByTopic: { "topic-ai": "beginner" },
      impressionsByContent: { "card-1": 5 },
      recentSourceNames: ["Example Publisher"],
    });

    const scored = scoreCandidate(card(), context, config);

    expect(scored.components.learnedAffinity).toBe(0);
    expect(scored.components.levelFit).toBe(0);
    expect(scored.components.timeFit).toBe(0);
    expect(scored.components.impressionPenalty).toBe(0);
    expect(scored.components.sameSourcePenalty).toBe(0);
    // Quality and freshness still apply, so the feed is still ordered.
    expect(scored.components.quality).toBeGreaterThan(0);
    expect(scored.components.freshness).toBeGreaterThan(0);
  });

  it("still honours a topic the person explicitly chose", () => {
    const context = learner({ personalisationEnabled: false, declaredTopicIds: ["topic-ai"] });

    expect(scoreCandidate(card(), context, config).components.declaredInterest).toBe(1);
  });
});

describe("changing the weights changes the order", () => {
  it("lets quality outrank a declared interest when weighted to", () => {
    const chosenAverage = card({ contentId: "chosen", topicId: "topic-ai", qualityScore: 40 });
    const unchosenExcellent = card({ contentId: "other", topicId: "topic-x", qualityScore: 100 });
    const context = learner({ declaredTopicIds: ["topic-ai"] });

    const qualityFirst: RankingConfig = {
      ...config,
      version: 2,
      weights: { ...config.weights, declaredInterest: 0.05, quality: 0.6 },
    };

    expect(
      rankCandidates([chosenAverage, unchosenExcellent], context, config)[0]!.candidate.contentId,
    ).toBe("chosen");
    expect(
      rankCandidates([chosenAverage, unchosenExcellent], context, qualityFirst)[0]!.candidate
        .contentId,
    ).toBe("other");
  });
});
