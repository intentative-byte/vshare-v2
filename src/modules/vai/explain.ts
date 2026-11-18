import type { ScoreComponents } from "./ranker";

/**
 * "Why this?"
 *
 * Every sentence is generated from a component the ranker actually used,
 * with the weight it carried. Nothing here invents a reason, and nothing
 * describes a signal that did not contribute: if a card was chosen mostly
 * on quality and freshness, that is what it says.
 */

export type Explanation = {
  /** Plain sentences, strongest contribution first. */
  reasons: string[];
  /** The component that contributed most, for analysis. */
  leading: string | null;
};

type ExplainContext = {
  topicName: string;
  isDiscovery: boolean;
  personalisationEnabled: boolean;
};

/**
 * Below this many impressions, the engagement component is mostly the prior
 * rather than a measurement, so there is nothing truthful to say about how
 * other readers got on. It matches the prior weight in the configuration.
 */
const minimumEngagementSample = 20;

const phrasing: Record<string, (context: ExplainContext) => string> = {
  declaredInterest: (context) => `You chose ${context.topicName}.`,
  learnedAffinity: (context) => `You have been spending time on ${context.topicName}.`,
  quality: () => "Our reviewers rated this highly.",
  levelFit: () => "It matches the level you are working at.",
  engagementQuality: () => "Most people who started this finished it.",
  freshness: () => "It was added recently.",
  timeFit: () => "It fits the time you set aside.",
  formatFit: () => "It is in a format you have told us you prefer.",
};

const penaltyPhrasing: Record<string, string> = {
  impressionPenalty: "You have seen this before, so it is ranked lower.",
  sameSourcePenalty: "You have just read something from the same source.",
};

export function explain(
  components: Partial<ScoreComponents>,
  weights: Record<string, number>,
  context: ExplainContext,
): Explanation {
  const sample = components.engagementSample ?? 0;

  const contributions = Object.entries(components)
    .filter(([name]) => name in phrasing)
    // Say nothing about other readers until enough of them have been shown
    // the card for the number to mean anything.
    .filter(([name]) => name !== "engagementQuality" || sample >= minimumEngagementSample)
    .map(([name, value]) => ({
      name,
      contribution: (weights[name] ?? 0) * (value ?? 0),
    }))
    // Only a component that actually moved the score is worth a sentence.
    .filter((entry) => entry.contribution > 0.001)
    .sort((a, b) => b.contribution - a.contribution);

  const reasons = contributions.slice(0, 3).map((entry) => {
    const phrase = phrasing[entry.name];
    return phrase ? phrase(context) : "";
  });

  if (context.isDiscovery) {
    reasons.unshift("Something outside your usual topics, to widen the picture.");
  }

  for (const [name, phrase] of Object.entries(penaltyPhrasing)) {
    const value = components[name as keyof ScoreComponents];

    if (typeof value === "number" && value < 0) {
      reasons.push(phrase);
    }
  }

  if (!context.personalisationEnabled) {
    reasons.push("Personalisation is off, so this is ranked on quality and recency only.");
  }

  if (reasons.length === 0) {
    reasons.push("This is the best match we have in the catalogue right now.");
  }

  return {
    reasons: reasons.filter(Boolean),
    leading: contributions[0]?.name ?? null,
  };
}
