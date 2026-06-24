import { interestOptions } from "@/lib/data";
import type { Interest, LearningContent, UserSignal } from "@/lib/types";

export type InterestScores = Record<Interest, number>;

const neutralInterestScore = 35;
const selectedInterestScore = 72;

const signalWeights: Record<UserSignal["type"], number> = {
  topic_selected: 20,
  view_started: 2,
  content_viewed: 4,
  watch_time: 0.08,
  content_completed: 14,
  scroll_away: -6,
  content_skipped: -18,
  content_saved: 16,
  content_unsaved: -6,
  content_liked: 12,
  content_unliked: -8,
  not_interested: -26,
  content_shared: 18,
  replay: 10,
  search: 7,
  explore_activity: 5,
  profile_activity: 1,
  path_followed: 8,
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function createDefaultInterestScores(selectedInterests: Interest[] = []): InterestScores {
  return interestOptions.reduce((scores, interest) => {
    scores[interest] = selectedInterests.includes(interest) ? selectedInterestScore : neutralInterestScore;
    return scores;
  }, {} as InterestScores);
}

export function normalizeInterestScores(scores: Partial<Record<Interest, number>> | undefined, selectedInterests: Interest[] = []) {
  const defaults = createDefaultInterestScores(selectedInterests);

  return interestOptions.reduce((normalizedScores, interest) => {
    normalizedScores[interest] = clampScore(scores?.[interest] ?? defaults[interest]);
    return normalizedScores;
  }, {} as InterestScores);
}

export function recalibrateSelectedInterests(scores: InterestScores, selectedInterests: Interest[]) {
  return interestOptions.reduce((nextScores, interest) => {
    const selectionBoost = selectedInterests.includes(interest) ? 18 : -4;
    nextScores[interest] = clampScore(scores[interest] + selectionBoost);
    return nextScores;
  }, { ...scores });
}

export function updateInterestScoresForSignal(
  scores: InterestScores,
  signal: UserSignal,
  content: LearningContent | null,
) {
  const impactedInterests = new Set<Interest>();

  if (signal.topic) {
    impactedInterests.add(signal.topic);
  }

  content?.interests.forEach((interest) => impactedInterests.add(interest));

  if (!impactedInterests.size) {
    return scores;
  }

  const baseWeight = signalWeights[signal.type] * (signal.value ?? 1);
  const nextScores = { ...scores };

  impactedInterests.forEach((interest) => {
    nextScores[interest] = clampScore(nextScores[interest] + baseWeight);
  });

  return nextScores;
}
