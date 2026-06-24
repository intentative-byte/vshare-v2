import { useMemo, useSyncExternalStore } from "react";
import { interestOptions, learningContent } from "@/lib/data";
import { getContentHealthMetrics } from "@/lib/analytics/content-health";
import { getProductAnalytics } from "@/lib/analytics/product-analytics";
import { getRetentionMetrics } from "@/lib/analytics/retention";
import { getSavedLibrary } from "@/lib/content/saved-library";
import {
  createDefaultInterestScores,
  normalizeInterestScores,
  recalibrateSelectedInterests,
  updateInterestScoresForSignal,
} from "@/lib/calibration/interest-scores";
import { rankFeedContent } from "@/lib/feed-ranking/rank-content";
import { getDailyMission } from "@/lib/missions/daily-mission";
import {
  defaultSessionMemory,
  normalizeSessionMemory,
  rememberActiveTopic,
  rememberRouteActivity,
  rememberSearchQuery,
  rememberViewedContent,
} from "@/lib/memory/session-memory";
import { getNotificationIntents } from "@/lib/notifications/framework";
import { getRecommendedLearningPaths } from "@/lib/paths/learning-paths";
import { getWeeklyRecap } from "@/lib/retention/weekly-recap";
import type { ContentEngagement, Interest, LearningState, UserSignal } from "@/lib/types";

const learningStateKey = "vshare:learning-state";
const learningStoreEvent = "vshare:learning-state-change";

function createDefaultLearningState(): LearningState {
  return {
    interests: [],
    interestScores: createDefaultInterestScores(),
    viewedContentIds: [],
    savedContentIds: [],
    completedContentIds: [],
    skippedContentIds: [],
    followedPathIds: [],
    viewedAtById: {},
    contentEngagement: {},
    signals: [],
    memory: defaultSessionMemory,
    streak: 0,
    lastActiveDate: null,
    onboardedAt: null,
  };
}

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

function uniqueValues(values: string[]) {
  return Array.from(new Set(values));
}

function getDefaultEngagement(): ContentEngagement {
  return {
    views: 0,
    watchSeconds: 0,
    completions: 0,
    skips: 0,
    saves: 0,
    shares: 0,
    lastViewedAt: null,
    lastCompletedAt: null,
    lastSkippedAt: null,
  };
}

function normalizeContentEngagement(
  engagement: Partial<Record<string, Partial<ContentEngagement>>> | undefined,
): Record<string, ContentEngagement> {
  return Object.entries(engagement ?? {}).reduce<Record<string, ContentEngagement>>((normalizedEngagement, [contentId, value]) => {
    normalizedEngagement[contentId] = {
      ...getDefaultEngagement(),
      ...value,
    };
    return normalizedEngagement;
  }, {});
}

function parseLearningState(value: string | null): LearningState {
  const defaultLearningState = createDefaultLearningState();

  if (!value) {
    return defaultLearningState;
  }

  try {
    const parsed = JSON.parse(value) as Partial<LearningState>;
    const interests = uniqueInterests(parsed.interests ?? []);

    return {
      ...defaultLearningState,
      ...parsed,
      interests,
      interestScores: normalizeInterestScores(parsed.interestScores, interests),
      viewedContentIds: uniqueValues(parsed.viewedContentIds ?? []),
      savedContentIds: uniqueValues(parsed.savedContentIds ?? []),
      completedContentIds: uniqueValues(parsed.completedContentIds ?? []),
      skippedContentIds: uniqueValues(parsed.skippedContentIds ?? []),
      followedPathIds: uniqueValues(parsed.followedPathIds ?? []),
      viewedAtById: parsed.viewedAtById ?? {},
      contentEngagement: normalizeContentEngagement(parsed.contentEngagement),
      signals: (parsed.signals ?? []).slice(-600),
      memory: normalizeSessionMemory(parsed.memory),
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

function createSignal(input: Omit<UserSignal, "id" | "occurredAt">): UserSignal {
  return {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    occurredAt: new Date().toISOString(),
  };
}

function getContentById(contentId: string | undefined) {
  return learningContent.find((content) => content.id === contentId) ?? null;
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

function appendSignal(state: LearningState, signal: UserSignal) {
  return {
    ...state,
    signals: [...state.signals, signal].slice(-600),
  };
}

function updateEngagementForSignal(state: LearningState, signal: UserSignal): LearningState {
  if (!signal.contentId) {
    return state;
  }

  const engagement = state.contentEngagement[signal.contentId] ?? getDefaultEngagement();
  const now = signal.occurredAt;

  const nextEngagement: ContentEngagement = {
    ...engagement,
    views: signal.type === "content_viewed" ? engagement.views + 1 : engagement.views,
    watchSeconds: signal.type === "watch_time" ? engagement.watchSeconds + Math.max(0, signal.value ?? 0) : engagement.watchSeconds,
    completions: signal.type === "content_completed" ? engagement.completions + 1 : engagement.completions,
    skips: signal.type === "content_skipped" ? engagement.skips + 1 : engagement.skips,
    saves: signal.type === "content_saved" ? engagement.saves + 1 : engagement.saves,
    shares: signal.type === "content_shared" ? engagement.shares + 1 : engagement.shares,
    lastViewedAt: signal.type === "content_viewed" ? now : engagement.lastViewedAt,
    lastCompletedAt: signal.type === "content_completed" ? now : engagement.lastCompletedAt,
    lastSkippedAt: signal.type === "content_skipped" ? now : engagement.lastSkippedAt,
  };

  return {
    ...state,
    contentEngagement: {
      ...state.contentEngagement,
      [signal.contentId]: nextEngagement,
    },
  };
}

function updateCollectionsForSignal(state: LearningState, signal: UserSignal): LearningState {
  if (!signal.contentId) {
    return state;
  }

  const contentId = signal.contentId;

  if (signal.type === "content_viewed") {
    return {
      ...rememberViewedContent(state, contentId, signal.value ?? state.memory.lastViewedPosition),
      viewedContentIds: state.viewedContentIds.includes(contentId) ? state.viewedContentIds : [...state.viewedContentIds, contentId],
      viewedAtById: {
        ...state.viewedAtById,
        [contentId]: signal.occurredAt,
      },
    };
  }

  if (signal.type === "content_completed") {
    return {
      ...state,
      completedContentIds: state.completedContentIds.includes(contentId)
        ? state.completedContentIds
        : [...state.completedContentIds, contentId],
      skippedContentIds: state.skippedContentIds.filter((id) => id !== contentId),
    };
  }

  if (signal.type === "content_skipped") {
    return {
      ...state,
      skippedContentIds: state.skippedContentIds.includes(contentId)
        ? state.skippedContentIds
        : [...state.skippedContentIds, contentId],
    };
  }

  if (signal.type === "content_saved") {
    return {
      ...state,
      savedContentIds: state.savedContentIds.includes(contentId) ? state.savedContentIds : [...state.savedContentIds, contentId],
    };
  }

  if (signal.type === "content_unsaved") {
    return {
      ...state,
      savedContentIds: state.savedContentIds.filter((id) => id !== contentId),
    };
  }

  return state;
}

function applySignal(state: LearningState, signal: UserSignal): LearningState {
  const content = getContentById(signal.contentId);
  const stateWithSignal = appendSignal(state, signal);
  const stateWithEngagement = updateEngagementForSignal(stateWithSignal, signal);
  const stateWithCollections = updateCollectionsForSignal(stateWithEngagement, signal);
  const stateWithScores = {
    ...stateWithCollections,
    interestScores: updateInterestScoresForSignal(stateWithCollections.interestScores, signal, content),
  };

  if (signal.type === "search") {
    return rememberSearchQuery(stateWithScores, signal.query ?? "");
  }

  if ((signal.type === "topic_selected" || signal.type === "explore_activity") && signal.topic) {
    return rememberActiveTopic(stateWithScores, signal.topic);
  }

  if (content?.interests[0]) {
    return rememberActiveTopic(stateWithScores, content.interests[0]);
  }

  if (signal.type === "profile_activity") {
    return rememberRouteActivity(stateWithScores, "profile");
  }

  return stateWithScores;
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
  return updateLearningState((state) => {
    const selectedInterests = uniqueInterests(interests);
    const now = new Date().toISOString();
    const selectionSignals = selectedInterests.map((interest) =>
      createSignal({
        type: "topic_selected",
        topic: interest,
      }),
    );
    const initialState: LearningState = {
      ...state,
      interests: selectedInterests,
      interestScores: recalibrateSelectedInterests(state.interestScores, selectedInterests),
      onboardedAt: state.onboardedAt ?? now,
    };

    return selectionSignals.reduce<LearningState>((nextState, signal) => applySignal(nextState, signal), initialState);
  });
}

export function recordUserSignal(input: Omit<UserSignal, "id" | "occurredAt">) {
  return updateLearningState((state) => applySignal(state, createSignal(input)));
}

export function markContentViewed(contentId: string, position = 0) {
  return recordUserSignal({ type: "content_viewed", contentId, value: position });
}

export function recordWatchTime(contentId: string, seconds: number) {
  if (seconds < 1) {
    return getLearningState();
  }

  return recordUserSignal({ type: "watch_time", contentId, value: Math.round(seconds) });
}

export function markContentCompleted(contentId: string) {
  return recordUserSignal({ type: "content_completed", contentId });
}

export function markContentSkipped(contentId: string) {
  return recordUserSignal({ type: "content_skipped", contentId });
}

export function markContentShared(contentId: string) {
  return recordUserSignal({ type: "content_shared", contentId });
}

export function toggleFollowPath(pathId: string) {
  return updateLearningState((state) => {
    const isFollowed = state.followedPathIds.includes(pathId);
    const nextState = {
      ...state,
      followedPathIds: isFollowed ? state.followedPathIds.filter((id) => id !== pathId) : [...state.followedPathIds, pathId],
    };

    return isFollowed
      ? nextState
      : applySignal(
          nextState,
          createSignal({
            type: "path_followed",
          }),
        );
  });
}

export function toggleSavedContent(contentId: string) {
  const state = getLearningState();
  const isSaved = state.savedContentIds.includes(contentId);
  return recordUserSignal({ type: isSaved ? "content_unsaved" : "content_saved", contentId });
}

export function recordSearchActivity(query: string) {
  return recordUserSignal({ type: "search", query });
}

export function recordExploreActivity(topic?: Interest) {
  return recordUserSignal({ type: "explore_activity", topic });
}

export function recordProfileActivity() {
  return recordUserSignal({ type: "profile_activity" });
}

export function recordFeedActivity() {
  return updateLearningState((state) => rememberRouteActivity(state, "feed"));
}

export function getRecommendedContent(state: LearningState) {
  return rankFeedContent(state).map((rankedContent) => rankedContent.content);
}

export function getRankedRecommendedContent(state: LearningState) {
  return rankFeedContent(state);
}

export function getSavedContent(state: LearningState) {
  const savedIds = new Set(state.savedContentIds);
  return learningContent.filter((content) => savedIds.has(content.id));
}

export function getGroupedSavedLibrary(state: LearningState) {
  return getSavedLibrary(state);
}

export function getProgressStats(state: LearningState) {
  const viewedIds = new Set(state.viewedContentIds);
  const completedIds = new Set(state.completedContentIds);
  const completedContent = learningContent.filter((content) => completedIds.has(content.id));
  const totalMinutes = completedContent.reduce((total, content) => total + content.durationMinutes, 0);
  const health = getContentHealthMetrics(state);
  const retention = getRetentionMetrics(state);
  const mission = getDailyMission(state);
  const weeklyRecap = getWeeklyRecap(state);
  const learningPaths = getRecommendedLearningPaths(state);
  const notifications = getNotificationIntents(state);
  const productAnalytics = getProductAnalytics(state);

  return {
    viewedCount: state.viewedContentIds.length,
    completedCount: state.completedContentIds.length,
    skippedCount: state.skippedContentIds.length,
    savedCount: state.savedContentIds.length,
    totalMinutes,
    streak: state.streak,
    unseenCount: Math.max(0, getRecommendedContent(state).filter((content) => !viewedIds.has(content.id)).length),
    health,
    retention,
    mission,
    weeklyRecap,
    learningPaths,
    notifications,
    productAnalytics,
  };
}
