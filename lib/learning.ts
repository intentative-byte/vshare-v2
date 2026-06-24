import { useMemo, useSyncExternalStore } from "react";
import { interestOptions, learningContent } from "@/lib/data";
import type { Interest, LearningContent, LearningState } from "@/lib/types";

const learningStateKey = "vshare:learning-state";
const learningStoreEvent = "vshare:learning-state-change";

const defaultLearningState: LearningState = {
  interests: [],
  viewedContentIds: [],
  savedContentIds: [],
  viewedAtById: {},
  streak: 0,
  lastActiveDate: null,
  onboardedAt: null,
};

function isBrowser() {
  return typeof window !== "undefined";
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isYesterday(date: string) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date === yesterday.toISOString().slice(0, 10);
}

function normalizeInterest(value: string): Interest | null {
  return interestOptions.find((interest) => interest === value) ?? null;
}

function uniqueInterests(interests: string[]): Interest[] {
  return Array.from(new Set(interests.map(normalizeInterest).filter((interest): interest is Interest => Boolean(interest))));
}

function parseLearningState(value: string | null): LearningState {
  if (!value) {
    return defaultLearningState;
  }

  try {
    const parsed = JSON.parse(value) as Partial<LearningState>;
    return {
      ...defaultLearningState,
      ...parsed,
      interests: uniqueInterests(parsed.interests ?? []),
      viewedContentIds: Array.from(new Set(parsed.viewedContentIds ?? [])),
      savedContentIds: Array.from(new Set(parsed.savedContentIds ?? [])),
      viewedAtById: parsed.viewedAtById ?? {},
    };
  } catch {
    return defaultLearningState;
  }
}

function getLearningStateSnapshot() {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(learningStateKey);
}

function subscribeToLearningState(onStoreChange: () => void) {
  if (!isBrowser()) {
    return () => {};
  }

  const handleStorageChange = () => onStoreChange();

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(learningStoreEvent, handleStorageChange);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(learningStoreEvent, handleStorageChange);
  };
}

function notifyLearningStateChange() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(learningStoreEvent));
}

function writeLearningState(state: LearningState) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(learningStateKey, JSON.stringify(state));
  notifyLearningStateChange();
}

function touchStreak(state: LearningState): LearningState {
  const today = todayKey();

  if (state.lastActiveDate === today) {
    return state;
  }

  return {
    ...state,
    lastActiveDate: today,
    streak: state.lastActiveDate && isYesterday(state.lastActiveDate) ? state.streak + 1 : 1,
  };
}

export function getLearningState() {
  return parseLearningState(getLearningStateSnapshot());
}

export function useLearningState() {
  const storedValue = useSyncExternalStore(subscribeToLearningState, getLearningStateSnapshot, () => null);

  return useMemo(() => parseLearningState(storedValue), [storedValue]);
}

export function updateLearningState(updater: (state: LearningState) => LearningState) {
  const nextState = touchStreak(updater(getLearningState()));
  writeLearningState(nextState);
  return nextState;
}

export function saveInterests(interests: string[]) {
  return updateLearningState((state) => ({
    ...state,
    interests: uniqueInterests(interests),
    onboardedAt: state.onboardedAt ?? new Date().toISOString(),
  }));
}

export function markContentViewed(contentId: string) {
  return updateLearningState((state) => ({
    ...state,
    viewedContentIds: state.viewedContentIds.includes(contentId)
      ? state.viewedContentIds
      : [...state.viewedContentIds, contentId],
    viewedAtById: {
      ...state.viewedAtById,
      [contentId]: new Date().toISOString(),
    },
  }));
}

export function toggleSavedContent(contentId: string) {
  return updateLearningState((state) => ({
    ...state,
    savedContentIds: state.savedContentIds.includes(contentId)
      ? state.savedContentIds.filter((id) => id !== contentId)
      : [...state.savedContentIds, contentId],
  }));
}

export type RecommendationSignals = {
  interests: Interest[];
  viewedContentIds: Set<string>;
  savedContentIds: Set<string>;
};

export function getRecommendationSignals(state: LearningState): RecommendationSignals {
  return {
    interests: state.interests,
    viewedContentIds: new Set(state.viewedContentIds),
    savedContentIds: new Set(state.savedContentIds),
  };
}

function scoreContent(content: LearningContent, signals: RecommendationSignals) {
  const interestScore = signals.interests.reduce(
    (score, interest) => score + (content.interests.includes(interest) ? 40 : 0),
    0,
  );
  const unseenBoost = signals.viewedContentIds.has(content.id) ? 0 : 25;
  const savedBoost = signals.savedContentIds.has(content.id) ? 4 : 0;

  // Future VAI integration can add semantic ranking here without changing route components.
  return interestScore + unseenBoost + savedBoost + new Date(content.createdAt).getTime() / 100000000000;
}

export function getRecommendedContent(state: LearningState) {
  const signals = getRecommendationSignals(state);
  const hasInterests = signals.interests.length > 0;
  const relevantContent = hasInterests
    ? learningContent.filter((content) => content.interests.some((interest) => signals.interests.includes(interest)))
    : learningContent;

  return [...relevantContent].sort((a, b) => {
    const aViewed = signals.viewedContentIds.has(a.id);
    const bViewed = signals.viewedContentIds.has(b.id);

    if (aViewed !== bViewed) {
      return aViewed ? 1 : -1;
    }

    return scoreContent(b, signals) - scoreContent(a, signals);
  });
}

export function getSavedContent(state: LearningState) {
  const savedIds = new Set(state.savedContentIds);
  return learningContent.filter((content) => savedIds.has(content.id));
}

export function getProgressStats(state: LearningState) {
  const viewedIds = new Set(state.viewedContentIds);
  const completedContent = learningContent.filter((content) => viewedIds.has(content.id));
  const totalMinutes = completedContent.reduce((total, content) => total + content.durationMinutes, 0);

  return {
    completedCount: completedContent.length,
    savedCount: state.savedContentIds.length,
    totalMinutes,
    streak: state.streak,
    unseenCount: Math.max(0, getRecommendedContent(state).filter((content) => !viewedIds.has(content.id)).length),
  };
}
