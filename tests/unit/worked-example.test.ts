import { describe, expect, it } from "vitest";
import {
  assembleSession,
  explain,
  rankCandidates,
  type Candidate,
  type LearnerContext,
  type Level,
  type RankingConfig,
} from "@/modules/vai";

/**
 * A worked example on the ten cards in batch 1.
 *
 * This is a test — every claim below is asserted — and it also prints the
 * ranking so the behaviour can be inspected rather than taken on trust.
 * Run it with: npx vitest run tests/unit/worked-example.test.ts
 *
 * The weights and parameters are the ones in the active ranking
 * configuration (migration 20261114150000_feed.sql).
 */

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

const published = "2026-11-10T09:00:00Z";
const now = new Date("2026-11-14T12:00:00Z").getTime();

// The ten cards of batch 1, with the classification they were seeded with.
const titles: Record<string, string> = {
  "ml-crash-course": "A structured first course in machine learning",
  "security-tips": "The handful of security steps that matter most",
  "data-access": "How to ask an organisation what it knows about you",
  budget: "A budget planner that does the arithmetic for you",
  scams: "The pause that stops most financial scams",
  sleep: "What actually helps when you cannot sleep",
  writing: "Writing that people understand the first time",
  interviews: "Preparing for an interview without guessing",
  spaced: "Why reviewing at increasing intervals works",
  business: "The actual steps to set up a business in the UK",
};

const batchOne: Candidate[] = ([
  { contentId: "ml-crash-course", topicId: "ai-foundations", sourceName: "Google", qualityScore: 85, level: "beginner", estimatedMinutes: 25 },
  { contentId: "security-tips", topicId: "security-basics", sourceName: "NCSC", qualityScore: 90, level: "beginner", estimatedMinutes: 10 },
  { contentId: "data-access", topicId: "data-and-privacy", sourceName: "ICO", qualityScore: 85, level: "beginner", estimatedMinutes: 8 },
  { contentId: "budget", topicId: "budgeting", sourceName: "MoneyHelper", qualityScore: 85, level: "beginner", estimatedMinutes: 20 },
  { contentId: "scams", topicId: "avoiding-scams", sourceName: "Take Five", qualityScore: 85, level: "beginner", estimatedMinutes: 8 },
  { contentId: "sleep", topicId: "sleep", sourceName: "NHS", qualityScore: 90, level: "beginner", estimatedMinutes: 7 },
  { contentId: "writing", topicId: "clear-writing", sourceName: "GDS", qualityScore: 85, level: "beginner", estimatedMinutes: 12 },
  { contentId: "interviews", topicId: "interviews", sourceName: "National Careers Service", qualityScore: 80, level: "beginner", estimatedMinutes: 12 },
  { contentId: "spaced", topicId: "spaced-repetition", sourceName: "Michael Nielsen", qualityScore: 85, level: "intermediate", estimatedMinutes: 35 },
  { contentId: "business", topicId: "running-a-small-business", sourceName: "GOV.UK", qualityScore: 80, level: "beginner", estimatedMinutes: 15 },
] as Array<Omit<Candidate, "secondaryTopicIds" | "publishedAt" | "stats"> & { level: Level }>).map(
  (card) => ({
    ...card,
    secondaryTopicIds: [],
    publishedAt: published,
    stats: { impressions: 0, completions: 0 },
  }),
);

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

function report(label: string, context: LearnerContext) {
  const ranked = rankCandidates(batchOne, context, config);
  const session = assembleSession(ranked, config, { declaredTopicIds: context.declaredTopicIds });

  console.log(`\n${label}`);
  console.log("  pos  score   card");

  for (const item of session.items) {
    const reasons = explain(item.components, config.weights as unknown as Record<string, number>, {
      topicName: item.candidate.topicId.replace(/-/g, " "),
      isDiscovery: item.isDiscovery,
      personalisationEnabled: context.personalisationEnabled,
    });

    console.log(
      `  ${String(item.position).padStart(3)}  ${item.score.toFixed(3)}  ${titles[item.candidate.contentId]}` +
        `${item.isDiscovery ? "  [discovery]" : ""}`,
    );
    console.log(`         why: ${reasons.reasons.join(" ")}`);
  }

  return session;
}

describe("worked example on batch 1", () => {
  it("a brand-new visitor gets the best-reviewed, best-fitting cards", () => {
    const session = report("New visitor, no topics chosen", learner());

    expect(session.items).toHaveLength(7);

    // Nothing is known, so quality, engagement and time fit decide. The two
    // highest-rated short cards should lead.
    const leaders = session.items.slice(0, 2).map((item) => item.candidate.contentId);
    expect(leaders).toContain("sleep");
    expect(leaders).toContain("security-tips");
  });

  it("choosing finance moves finance to the top without crowding out everything else", () => {
    const session = report(
      "Chose Budgeting and Avoiding scams",
      learner({ declaredTopicIds: ["budgeting", "avoiding-scams"] }),
    );

    const first = session.items[0]!.candidate.contentId;
    expect(["budget", "scams"]).toContain(first);

    // Variety still holds: not every card is from the chosen topics.
    const chosen = session.items.filter((item) =>
      ["budgeting", "avoiding-scams"].includes(item.candidate.topicId),
    );
    expect(chosen.length).toBeLessThan(session.items.length);

    // And one slot is explicitly there to widen the picture.
    expect(session.items.filter((item) => item.isDiscovery)).toHaveLength(1);
  });

  it("matching someone's level raises a card's score", () => {
    const scoreOf = (context: LearnerContext) =>
      rankCandidates(batchOne, context, config).find(
        (entry) => entry.candidate.contentId === "spaced",
      )!.score;

    const asBeginner = scoreOf(learner());
    const asIntermediate = scoreOf(learner({ levelByTopic: { "spaced-repetition": "intermediate" } }));

    expect(asIntermediate).toBeGreaterThan(asBeginner);
  });

  it("but a thirty-five minute card still ranks low for a ten-minute session", () => {
    // This is the ranker working, not failing: level fit is worth 0.10 and
    // time fit 0.05, and a card four times longer than the session scores
    // nothing on time. Someone with longer to spend sees it rise.
    const shortSession = rankCandidates(
      batchOne,
      learner({ levelByTopic: { "spaced-repetition": "intermediate" }, preferredMinutes: 10 }),
      config,
    );
    const longSession = rankCandidates(
      batchOne,
      learner({ levelByTopic: { "spaced-repetition": "intermediate" }, preferredMinutes: 40 }),
      config,
    );

    const positionOf = (list: typeof shortSession) =>
      list.findIndex((entry) => entry.candidate.contentId === "spaced");

    expect(positionOf(shortSession)).toBe(batchOne.length - 1);
    expect(positionOf(longSession)).toBeLessThan(positionOf(shortSession));
  });

  it("skipping something is respected the next time round", () => {
    // A skipped card is excluded from candidates entirely, which the
    // database query does. Here we show the ranking effect of the affinity
    // drop that accompanies it.
    const before = rankCandidates(batchOne, learner({ declaredTopicIds: ["sleep"] }), config);
    const after = rankCandidates(
      batchOne,
      learner({ declaredTopicIds: ["sleep"], affinityByTopic: { sleep: 0.05 } }),
      config,
    );

    const scoreOf = (list: typeof before) =>
      list.find((entry) => entry.candidate.contentId === "sleep")!.score;

    expect(scoreOf(after)).toBeLessThan(scoreOf(before));
  });

  it("with personalisation off, the same person gets a quality-ordered feed", () => {
    const session = report(
      "Personalisation off",
      learner({ declaredTopicIds: ["budgeting"], personalisationEnabled: false }),
    );

    for (const item of session.items) {
      expect(item.components.learnedAffinity).toBe(0);
      expect(item.components.levelFit).toBe(0);
    }
  });
});
