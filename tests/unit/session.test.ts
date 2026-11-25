import { describe, expect, it } from "vitest";
import { assembleSession } from "@/modules/vai/session";
import { rankCandidates, type Candidate, type LearnerContext, type RankingConfig } from "@/modules/vai/ranker";
import { explain } from "@/modules/vai/explain";

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

function card(id: string, overrides: Partial<Candidate> = {}): Candidate {
  return {
    contentId: id,
    topicId: "topic-ai",
    secondaryTopicIds: [],
    sourceName: `Source ${id}`,
    qualityScore: 60,
    level: "beginner",
    estimatedMinutes: 8,
    publishedAt: "2026-11-01T12:00:00Z",
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

function manyCards(count: number, overrides: (index: number) => Partial<Candidate> = () => ({})) {
  return Array.from({ length: count }, (_, index) => card(`card-${index}`, overrides(index)));
}

describe("session boundaries", () => {
  it("is exactly seven cards by default", () => {
    const ranked = rankCandidates(manyCards(30), learner(), config);
    const session = assembleSession(ranked, config);

    expect(session.items).toHaveLength(7);
    expect(session.isShort).toBe(false);
  });

  it("numbers positions from one with no gaps", () => {
    const ranked = rankCandidates(manyCards(20), learner(), config);
    const session = assembleSession(ranked, config);

    expect(session.items.map((item) => item.position)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("never shows the same card twice in one session", () => {
    const ranked = rankCandidates(manyCards(20), learner(), config);
    const ids = assembleSession(ranked, config).items.map((item) => item.candidate.contentId);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is honest when the catalogue is nearly empty", () => {
    const ranked = rankCandidates(manyCards(3), learner(), config);
    const session = assembleSession(ranked, config);

    expect(session.items).toHaveLength(3);
    expect(session.isShort).toBe(true);
  });

  it("handles an empty catalogue without failing", () => {
    const session = assembleSession([], config);

    expect(session.items).toEqual([]);
    expect(session.isShort).toBe(true);
  });

  it("can be configured to a different length, for future experiments", () => {
    const ranked = rankCandidates(manyCards(30), learner(), config);

    expect(assembleSession(ranked, config, { size: 3 }).items).toHaveLength(3);
    expect(assembleSession(ranked, config, { size: 12 }).items).toHaveLength(12);
  });

  it("is reproducible", () => {
    const ranked = rankCandidates(manyCards(30), learner(), config);
    const first = assembleSession(ranked, config).items.map((item) => item.candidate.contentId);
    const second = assembleSession(
      rankCandidates(manyCards(30), learner(), config),
      config,
    ).items.map((item) => item.candidate.contentId);

    expect(first).toEqual(second);
  });
});

describe("variety inside a session", () => {
  it("does not run more than two cards from one topic together", () => {
    const candidates = manyCards(20, (index) => ({
      topicId: index < 10 ? "topic-ai" : "topic-finance",
      sourceName: `Source ${index}`,
    }));
    const ranked = rankCandidates(candidates, learner(), config);
    const topics = assembleSession(ranked, config).items.map((item) => item.candidate.topicId);

    for (let index = 0; index + 2 < topics.length; index += 1) {
      const run = topics.slice(index, index + 3);
      expect(new Set(run).size, `positions ${index + 1} to ${index + 3}`).toBeGreaterThan(1);
    }
  });

  it("takes at most two cards from any one source", () => {
    const candidates = manyCards(20, (index) => ({
      sourceName: index % 2 === 0 ? "Everywhere Publishing" : `Source ${index}`,
      topicId: `topic-${index % 4}`,
    }));
    const ranked = rankCandidates(candidates, learner(), config);
    const sources = assembleSession(ranked, config).items.map((item) => item.candidate.sourceName);
    const fromOne = sources.filter((name) => name === "Everywhere Publishing").length;

    expect(fromOne).toBeLessThanOrEqual(2);
  });

  it("fills the session even when variety cannot be satisfied", () => {
    // Everything from one topic and one source: the rules cannot all hold,
    // and a short session would be worse than a less varied one.
    const candidates = manyCards(10, () => ({ topicId: "topic-ai", sourceName: "One Source" }));
    const ranked = rankCandidates(candidates, learner(), config);

    expect(assembleSession(ranked, config).items).toHaveLength(7);
  });
});

describe("the discovery slot", () => {
  it("gives one slot to a topic outside the declared ones", () => {
    const candidates = [
      ...manyCards(10, (index) => ({ topicId: "topic-ai", sourceName: `A${index}` })),
      ...Array.from({ length: 5 }, (_, index) =>
        card(`other-${index}`, { topicId: "topic-history", sourceName: `H${index}` }),
      ),
    ];
    const context = learner({ declaredTopicIds: ["topic-ai"] });
    const session = assembleSession(rankCandidates(candidates, context, config), config, {
      declaredTopicIds: ["topic-ai"],
    });

    const discovery = session.items.filter((item) => item.isDiscovery);

    expect(discovery).toHaveLength(1);
    expect(discovery[0]!.position).toBe(5);
    expect(discovery[0]!.candidate.topicId).toBe("topic-history");
  });

  it("marks no discovery card when the person has chosen nothing", () => {
    const session = assembleSession(rankCandidates(manyCards(10), learner(), config), config);

    expect(session.items.every((item) => !item.isDiscovery)).toBe(true);
  });

  it("does not leave a gap when there is nothing outside the declared topics", () => {
    const candidates = manyCards(10, (index) => ({ topicId: "topic-ai", sourceName: `S${index}` }));
    const context = learner({ declaredTopicIds: ["topic-ai"] });
    const session = assembleSession(rankCandidates(candidates, context, config), config, {
      declaredTopicIds: ["topic-ai"],
    });

    expect(session.items).toHaveLength(7);
    expect(session.items.every((item) => !item.isDiscovery)).toBe(true);
  });
});

describe("explanations come from the ranking itself", () => {
  const weights = config.weights as unknown as Record<string, number>;

  it("names the strongest real contribution first", () => {
    const scored = rankCandidates(
      [card("a", { qualityScore: 60 })],
      learner({ declaredTopicIds: ["topic-ai"] }),
      config,
    )[0]!;

    const result = explain(scored.components, weights, {
      topicName: "AI foundations",
      isDiscovery: false,
      personalisationEnabled: true,
    });

    expect(result.leading).toBe("declaredInterest");
    expect(result.reasons[0]).toBe("You chose AI foundations.");
  });

  it("never claims a reason that contributed nothing", () => {
    const scored = rankCandidates([card("a")], learner(), config)[0]!;

    const result = explain(scored.components, weights, {
      topicName: "AI foundations",
      isDiscovery: false,
      personalisationEnabled: true,
    });

    // The person chose no topics, so that must not be offered as a reason.
    expect(result.reasons).not.toContain("You chose AI foundations.");
  });

  it("says when a card is there to widen the picture", () => {
    const scored = rankCandidates([card("a")], learner(), config)[0]!;

    const result = explain(scored.components, weights, {
      topicName: "History",
      isDiscovery: true,
      personalisationEnabled: true,
    });

    expect(result.reasons[0]).toMatch(/outside your usual topics/);
  });

  it("mentions a repetition penalty when one applied", () => {
    const scored = rankCandidates(
      [card("a")],
      learner({ impressionsByContent: { a: 3 } }),
      config,
    )[0]!;

    const result = explain(scored.components, weights, {
      topicName: "AI foundations",
      isDiscovery: false,
      personalisationEnabled: true,
    });

    expect(result.reasons.some((reason) => reason.includes("seen this before"))).toBe(true);
  });

  it("says so when personalisation is off", () => {
    const scored = rankCandidates(
      [card("a")],
      learner({ personalisationEnabled: false }),
      config,
    )[0]!;

    const result = explain(scored.components, weights, {
      topicName: "AI foundations",
      isDiscovery: false,
      personalisationEnabled: false,
    });

    expect(result.reasons.some((reason) => reason.includes("Personalisation is off"))).toBe(true);
  });

  it("always gives at least one sentence", () => {
    const result = explain({}, weights, {
      topicName: "AI foundations",
      isDiscovery: false,
      personalisationEnabled: true,
    });

    expect(result.reasons.length).toBeGreaterThan(0);
  });
});

describe("explanations never overstate the evidence", () => {
  const weights = config.weights as unknown as Record<string, number>;

  it("says nothing about other readers when a card has no history", () => {
    const scored = rankCandidates(
      [card("a", { stats: { impressions: 0, completions: 0 } })],
      learner(),
      config,
    )[0]!;

    const result = explain(scored.components, weights, {
      topicName: "Focus",
      isDiscovery: false,
      personalisationEnabled: true,
    });

    expect(result.reasons.some((reason) => reason.includes("finished it"))).toBe(false);
  });

  it("still says nothing when the sample is too small to mean anything", () => {
    const scored = rankCandidates(
      [card("a", { stats: { impressions: 3, completions: 3 } })],
      learner(),
      config,
    )[0]!;

    const result = explain(scored.components, weights, {
      topicName: "Focus",
      isDiscovery: false,
      personalisationEnabled: true,
    });

    expect(result.reasons.some((reason) => reason.includes("finished it"))).toBe(false);
  });

  it("says it once there is a real measurement behind it", () => {
    const scored = rankCandidates(
      [card("a", { stats: { impressions: 400, completions: 330 } })],
      learner(),
      config,
    )[0]!;

    const result = explain(scored.components, weights, {
      topicName: "Focus",
      isDiscovery: false,
      personalisationEnabled: true,
    });

    expect(result.reasons.some((reason) => reason.includes("finished it"))).toBe(true);
  });
});
