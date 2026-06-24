import type { Interest, LearningState, SessionMemory } from "@/lib/types";

export const defaultSessionMemory: SessionMemory = {
  lastViewedPosition: 0,
  lastViewedContentId: null,
  lastActiveTopic: null,
  lastSearchQuery: "",
  lastFeedVisitAt: null,
  lastExploreVisitAt: null,
  lastProfileVisitAt: null,
};

export function normalizeSessionMemory(memory: Partial<SessionMemory> | undefined): SessionMemory {
  return {
    ...defaultSessionMemory,
    ...memory,
  };
}

export function rememberViewedContent(state: LearningState, contentId: string, position: number): LearningState {
  return {
    ...state,
    memory: {
      ...state.memory,
      lastViewedContentId: contentId,
      lastViewedPosition: Math.max(0, Math.round(position)),
    },
  };
}

export function rememberActiveTopic(state: LearningState, topic: Interest): LearningState {
  return {
    ...state,
    memory: {
      ...state.memory,
      lastActiveTopic: topic,
    },
  };
}

export function rememberSearchQuery(state: LearningState, query: string): LearningState {
  return {
    ...state,
    memory: {
      ...state.memory,
      lastSearchQuery: query,
    },
  };
}

export function rememberRouteActivity(state: LearningState, route: "feed" | "explore" | "profile"): LearningState {
  const now = new Date().toISOString();

  return {
    ...state,
    memory: {
      ...state.memory,
      lastFeedVisitAt: route === "feed" ? now : state.memory.lastFeedVisitAt,
      lastExploreVisitAt: route === "explore" ? now : state.memory.lastExploreVisitAt,
      lastProfileVisitAt: route === "profile" ? now : state.memory.lastProfileVisitAt,
    },
  };
}
