import { useMemo, useSyncExternalStore } from "react";
import { getActivationProgress } from "@/lib/activation/progress";
import { getCapabilityOperatingSystem } from "@/lib/capability/operating-system";
import { interestOptions, learningContent } from "@/lib/data";
import { getContentHealthMetrics } from "@/lib/analytics/content-health";
import { getProductAnalytics } from "@/lib/analytics/product-analytics";
import { getRetentionMetrics } from "@/lib/analytics/retention";
import { getSavedLibrary } from "@/lib/content/saved-library";
import { getCreatorDiscovery } from "@/lib/creators/discovery";
import { getCreatorProfiles } from "@/lib/creators/profiles";
import {
  isDuplicateContribution,
  isRateLimited,
  passesMinimumQuality,
  scoreSubmissionQuality,
} from "@/lib/quality/submission-quality";
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
import { getLearningOperatingSystem } from "@/lib/intelligence/operating-system";
import { createGoal, getGoalProgress, isValidGoal } from "@/lib/goals/goal-engine";
import { getGoalRoadmaps } from "@/lib/roadmaps/decompose-goal";
import { createProject, isValidProject, updateProjectStatus } from "@/lib/projects/project-system";
import { defaultTimeAllocation, normalizeTimeAllocation, recommendTimeAllocation } from "@/lib/projects/time-allocation";
import { getPersonalDashboard } from "@/lib/growth/personal-dashboard";
import { getPersonalGrowthScore } from "@/lib/growth/growth-score";
import { createDecisionRecord, isValidDecision } from "@/lib/decisions/decision-framework";
import { createEvidence, isValidEvidence } from "@/lib/evidence/evidence-engine";
import { resolveDecision } from "@/lib/history/decision-history";
import { getDecisionIntelligence } from "@/lib/recommendations/decision-recommendations";
import { getOutcomeIntelligenceScore, getOutcomeTimeline } from "@/lib/outcomes/outcome-intelligence";
import { getSuccessAnalysis } from "@/lib/outcomes/success-analysis";
import { extractOutcomeFrameworks, extractOutcomeLessons } from "@/lib/learning/outcome-extraction";
import { generateOutcomePlaybooks } from "@/lib/playbooks/playbook-generator";
import { getNormalizedContentById } from "@/lib/content/ingestion";
import { updateConceptProgress, updateConceptProgressForOutcome } from "@/lib/progression/concept-pipeline";
import type {
  ContentEngagement,
  ContributionType,
  EvidenceType,
  GoalType,
  Interest,
  LearningState,
  DecisionOption,
  DecisionType,
  OutcomeType,
  ProjectStatus,
  TimeAllocation,
  UserContribution,
  UserGoal,
  UserOutcome,
  UserProject,
  UserSignal,
} from "@/lib/types";

const learningStateKey = "vshare:learning-state";
const learningStoreEvent = "vshare:learning-state-change";

function createDefaultLearningState(): LearningState {
  return {
    interests: [],
    interestScores: createDefaultInterestScores(),
    viewedContentIds: [],
    savedContentIds: [],
    likedContentIds: [],
    completedContentIds: [],
    skippedContentIds: [],
    notInterestedContentIds: [],
    followedPathIds: [],
    followedCreatorIds: [],
    userContributions: [],
    outcomes: [],
    evidence: [],
    conceptProgress: {},
    goals: [],
    projects: [],
    timeAllocation: defaultTimeAllocation,
    decisions: [],
    viewedAtById: {},
    contentEngagement: {},
    signals: [],
    memory: defaultSessionMemory,
    vaiMode: "partner",
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
    starts: 0,
    views: 0,
    watchSeconds: 0,
    completions: 0,
    scrollAways: 0,
    skips: 0,
    saves: 0,
    likes: 0,
    shares: 0,
    replays: 0,
    notInterested: 0,
    lastStartedAt: null,
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
      likedContentIds: uniqueValues(parsed.likedContentIds ?? []),
      completedContentIds: uniqueValues(parsed.completedContentIds ?? []),
      skippedContentIds: uniqueValues(parsed.skippedContentIds ?? []),
      notInterestedContentIds: uniqueValues(parsed.notInterestedContentIds ?? []),
      followedPathIds: uniqueValues(parsed.followedPathIds ?? []),
      followedCreatorIds: uniqueValues(parsed.followedCreatorIds ?? []),
      userContributions: parsed.userContributions ?? [],
      outcomes: parsed.outcomes ?? [],
      evidence: parsed.evidence ?? [],
      conceptProgress: parsed.conceptProgress ?? {},
      goals: parsed.goals ?? [],
      projects: parsed.projects ?? [],
      timeAllocation: normalizeTimeAllocation(parsed.timeAllocation),
      decisions: parsed.decisions ?? [],
      viewedAtById: parsed.viewedAtById ?? {},
      contentEngagement: normalizeContentEngagement(parsed.contentEngagement),
      signals: (parsed.signals ?? []).slice(-600),
      memory: normalizeSessionMemory(parsed.memory),
      vaiMode: parsed.vaiMode ?? "partner",
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
    starts: signal.type === "view_started" ? engagement.starts + 1 : engagement.starts,
    views: signal.type === "content_viewed" ? engagement.views + 1 : engagement.views,
    watchSeconds: signal.type === "watch_time" ? engagement.watchSeconds + Math.max(0, signal.value ?? 0) : engagement.watchSeconds,
    completions: signal.type === "content_completed" ? engagement.completions + 1 : engagement.completions,
    scrollAways: signal.type === "scroll_away" ? engagement.scrollAways + 1 : engagement.scrollAways,
    skips: signal.type === "content_skipped" ? engagement.skips + 1 : engagement.skips,
    saves: signal.type === "content_saved" ? engagement.saves + 1 : engagement.saves,
    likes: signal.type === "content_liked" ? engagement.likes + 1 : engagement.likes,
    shares: signal.type === "content_shared" ? engagement.shares + 1 : engagement.shares,
    replays: signal.type === "replay" ? engagement.replays + 1 : engagement.replays,
    notInterested: signal.type === "not_interested" ? engagement.notInterested + 1 : engagement.notInterested,
    lastStartedAt: signal.type === "view_started" ? now : engagement.lastStartedAt,
    lastViewedAt: signal.type === "content_viewed" ? now : engagement.lastViewedAt,
    lastCompletedAt: signal.type === "content_completed" ? now : engagement.lastCompletedAt,
    lastSkippedAt: signal.type === "content_skipped" || signal.type === "not_interested" ? now : engagement.lastSkippedAt,
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

  if (signal.type === "not_interested") {
    return {
      ...state,
      notInterestedContentIds: state.notInterestedContentIds.includes(contentId)
        ? state.notInterestedContentIds
        : [...state.notInterestedContentIds, contentId],
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

  if (signal.type === "content_liked") {
    return {
      ...state,
      likedContentIds: state.likedContentIds.includes(contentId) ? state.likedContentIds : [...state.likedContentIds, contentId],
      notInterestedContentIds: state.notInterestedContentIds.filter((id) => id !== contentId),
    };
  }

  if (signal.type === "content_unliked") {
    return {
      ...state,
      likedContentIds: state.likedContentIds.filter((id) => id !== contentId),
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
  const normalizedContent = signal.contentId ? getNormalizedContentById(stateWithCollections, signal.contentId) : null;
  const stateWithProgress =
    normalizedContent && signal.type === "content_completed"
      ? {
          ...stateWithCollections,
          conceptProgress: updateConceptProgress(stateWithCollections, normalizedContent, "learned"),
        }
      : normalizedContent && signal.type === "replay"
        ? {
            ...stateWithCollections,
            conceptProgress: updateConceptProgress(stateWithCollections, normalizedContent, "repeated"),
          }
        : normalizedContent && signal.type === "content_shared"
          ? {
              ...stateWithCollections,
              conceptProgress: updateConceptProgress(stateWithCollections, normalizedContent, "mastered"),
            }
          : stateWithCollections;
  const stateWithScores = {
    ...stateWithProgress,
    interestScores: updateInterestScoresForSignal(stateWithProgress.interestScores, signal, content),
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

export function recordViewStarted(contentId: string) {
  return recordUserSignal({ type: "view_started", contentId });
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

export function markScrollAway(contentId: string) {
  return recordUserSignal({ type: "scroll_away", contentId });
}

export function markContentShared(contentId: string) {
  return recordUserSignal({ type: "content_shared", contentId });
}

export function toggleLikedContent(contentId: string) {
  const state = getLearningState();
  const isLiked = state.likedContentIds.includes(contentId);
  return recordUserSignal({ type: isLiked ? "content_unliked" : "content_liked", contentId });
}

export function markNotInterested(contentId: string) {
  return recordUserSignal({ type: "not_interested", contentId });
}

export function markReplay(contentId: string) {
  return recordUserSignal({ type: "replay", contentId });
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

export function toggleFollowCreator(creatorId: string) {
  return updateLearningState((state) => {
    const isFollowed = state.followedCreatorIds.includes(creatorId);
    const nextState: LearningState = {
      ...state,
      followedCreatorIds: isFollowed
        ? state.followedCreatorIds.filter((id) => id !== creatorId)
        : [...state.followedCreatorIds, creatorId],
    };

    return applySignal(
      nextState,
      createSignal({
        type: isFollowed ? "creator_unfollowed" : "creator_followed",
        creatorId,
      }),
    );
  });
}

export type ContributionResult =
  | { ok: true; contribution: UserContribution }
  | { ok: false; error: "rate_limited" | "duplicate" | "low_quality" };

export function createContribution(input: {
  type: ContributionType;
  title: string;
  body: string;
  url: string | null;
  topics: Interest[];
}): ContributionResult {
  let result: ContributionResult = { ok: false, error: "low_quality" };

  updateLearningState((state) => {
    if (isRateLimited(state)) {
      result = { ok: false, error: "rate_limited" };
      return state;
    }

    if (isDuplicateContribution(state, input.title, input.url)) {
      result = { ok: false, error: "duplicate" };
      return state;
    }

    const quality = scoreSubmissionQuality({
      title: input.title,
      body: input.body,
      topics: input.topics,
      state,
    });

    if (!passesMinimumQuality(quality)) {
      result = { ok: false, error: "low_quality" };
      return state;
    }

    const contribution: UserContribution = {
      id: `contribution-${Date.now()}`,
      type: input.type,
      title: input.title.trim(),
      body: input.body.trim(),
      url: input.url?.trim() || null,
      topics: input.topics,
      createdAt: new Date().toISOString(),
      quality,
    };
    result = { ok: true, contribution };

    return applySignal(
      {
        ...state,
        userContributions: [contribution, ...state.userContributions].slice(0, 120),
      },
      createSignal({
        type: "contribution_created",
        topic: input.topics[0],
      }),
    );
  });

  return result;
}

export type OutcomeResult =
  | { ok: true; outcome: UserOutcome }
  | { ok: false; error: "invalid_outcome" | "invalid_evidence" };

export function logOutcome(input: {
  type: OutcomeType;
  goal?: string;
  action?: string;
  title: string;
  description: string;
  topics: Interest[];
  evidence?: {
    type: EvidenceType;
    label: string;
    value: string;
  };
}): OutcomeResult {
  if (input.title.trim().length < 4 || input.description.trim().length < 8 || input.topics.length === 0) {
    return { ok: false, error: "invalid_outcome" };
  }

  if (input.evidence && !isValidEvidence(input.evidence)) {
    return { ok: false, error: "invalid_evidence" };
  }

  let result: OutcomeResult = { ok: false, error: "invalid_outcome" };

  updateLearningState((state) => {
    const evidence = input.evidence ? createEvidence(input.evidence) : null;
    const outcome: UserOutcome = {
      id: `outcome-${Date.now()}`,
      type: input.type,
      goal: input.goal?.trim() || input.title.trim(),
      action: input.action?.trim() || input.description.trim(),
      title: input.title.trim(),
      description: input.description.trim(),
      topics: input.topics,
      evidenceIds: evidence ? [evidence.id] : [],
      createdAt: new Date().toISOString(),
    };
    const nextState = input.topics.reduce(
      (currentState, topic) => ({
        ...currentState,
        conceptProgress: updateConceptProgressForOutcome(currentState, topic, outcome.title, evidence ? "mastered" : "applied"),
      }),
      {
        ...state,
        outcomes: [outcome, ...state.outcomes].slice(0, 120),
        evidence: evidence ? [evidence, ...state.evidence].slice(0, 160) : state.evidence,
      },
    );

    result = { ok: true, outcome };
    return nextState;
  });

  return result;
}

export type GoalResult = { ok: true; goal: UserGoal } | { ok: false; error: "invalid_goal" };

export function addGoal(input: {
  type: GoalType;
  title: string;
  desiredOutcome: string;
  topics: Interest[];
  targetDate?: string | null;
}): GoalResult {
  if (!isValidGoal(input)) {
    return { ok: false, error: "invalid_goal" };
  }

  let result: GoalResult = { ok: false, error: "invalid_goal" };

  updateLearningState((state) => {
    const goal = createGoal(input);
    result = { ok: true, goal };

    return {
      ...state,
      goals: [goal, ...state.goals].slice(0, 40),
    };
  });

  return result;
}

export type ProjectResult = { ok: true; project: UserProject } | { ok: false; error: "invalid_project" };

export function addProject(input: {
  title: string;
  description: string;
  skills: string[];
  topics: Interest[];
}): ProjectResult {
  if (!isValidProject(input)) {
    return { ok: false, error: "invalid_project" };
  }

  let result: ProjectResult = { ok: false, error: "invalid_project" };

  updateLearningState((state) => {
    const project = createProject(input);
    result = { ok: true, project };

    return {
      ...state,
      projects: [project, ...state.projects].slice(0, 60),
    };
  });

  return result;
}

export type DecisionResult = { ok: true } | { ok: false; error: "invalid_decision" };

export function addDecision(input: {
  type: DecisionType;
  decision: string;
  reason: string;
  desiredOutcome: string;
  options: DecisionOption[];
  chosenOptionId: string;
}): DecisionResult {
  if (!isValidDecision(input)) {
    return { ok: false, error: "invalid_decision" };
  }

  updateLearningState((state) => ({
    ...state,
    decisions: [createDecisionRecord(input), ...state.decisions].slice(0, 120),
  }));

  return { ok: true };
}

export function setDecisionOutcome(decisionId: string, outcome: string) {
  if (outcome.trim().length < 3) {
    return getLearningState();
  }

  return updateLearningState((state) => ({
    ...state,
    decisions: state.decisions.map((decision) => (decision.id === decisionId ? resolveDecision(decision, outcome) : decision)),
  }));
}

export function setProjectStatus(projectId: string, status: ProjectStatus) {
  return updateLearningState((state) => ({
    ...state,
    projects: state.projects.map((project) => (project.id === projectId ? updateProjectStatus(project, status) : project)),
  }));
}

export function setTimeAllocation(allocation: Partial<TimeAllocation>) {
  return updateLearningState((state) => ({
    ...state,
    timeAllocation: normalizeTimeAllocation({
      ...state.timeAllocation,
      ...allocation,
    }),
  }));
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

export function setVaiMode(mode: LearningState["vaiMode"]) {
  return updateLearningState((state) => ({
    ...state,
    vaiMode: mode,
  }));
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
  const creatorProfiles = getCreatorProfiles(state);
  const creatorDiscovery = getCreatorDiscovery(state);
  const activation = getActivationProgress(state);
  const intelligence = getLearningOperatingSystem(state);
  const capability = getCapabilityOperatingSystem(state);
  const personalDashboard = getPersonalDashboard(state);
  const growth = getPersonalGrowthScore(state);
  const goalRoadmaps = getGoalRoadmaps(state);
  const recommendedTimeAllocation = recommendTimeAllocation(state);
  const decisionIntelligence = getDecisionIntelligence(state);
  const outcomeIntelligence = {
    score: getOutcomeIntelligenceScore(state),
    timeline: getOutcomeTimeline(state),
    successAnalysis: getSuccessAnalysis(state),
    lessons: extractOutcomeLessons(state),
    frameworks: extractOutcomeFrameworks(state),
    playbooks: generateOutcomePlaybooks(state),
  };

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
    creatorProfiles,
    creatorDiscovery,
    activation,
    intelligence,
    capability,
    personalDashboard,
    growth,
    goalRoadmaps,
    recommendedTimeAllocation,
    decisionIntelligence,
    outcomeIntelligence,
    goalProgress: state.goals.map((goal) => ({
      goal,
      progress: getGoalProgress(state, goal),
    })),
    resourcesShared: state.userContributions.length,
    followingCount: state.followedCreatorIds.length,
  };
}
