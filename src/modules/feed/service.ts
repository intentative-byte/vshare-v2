import "server-only";

import { assembleSession, explain, rankCandidates, type LearnerContext } from "@/modules/vai";
import type { Card } from "@/modules/content";
import { findPublishedCard, findPublishedCardById } from "@/modules/content/server";
import {
  endSession,
  loadActiveConfig,
  loadCandidates,
  loadRecommendationComponents,
  loadViewerMemory,
  recordRecommendations,
  startSession,
} from "./repository";

/**
 * Putting a session together.
 *
 * Load the active configuration and what the viewer has done, ask the
 * database for eligible cards, rank them, assemble a finite session, and
 * log what was shown along with the components that chose it.
 */

export type FeedCard = Card & {
  position: number;
  isDiscovery: boolean;
};

export type FeedSession = {
  sessionId: string;
  cards: FeedCard[];
  /** Fewer cards than a full session, because the catalogue ran out. */
  isShort: boolean;
  size: number;
};

export type BuildSessionOptions = {
  topicId: string | null;
  personalisationEnabled: boolean;
  preferredMinutes: number;
  size?: number;
  now?: number;
};

export async function buildSession(options: BuildSessionOptions): Promise<FeedSession | null> {
  const config = await loadActiveConfig();

  if (!config) {
    return null;
  }

  const size = options.size ?? config.params.sessionSize;
  const memory = await loadViewerMemory(config.params.repeatWindowHours);

  const candidates = await loadCandidates({
    topicId: options.topicId,
    excludeIds: memory.excludeIds,
  });

  // An empty pool is a real answer, not an error: the catalogue may simply
  // have nothing left for this person right now.
  if (candidates.length === 0) {
    const emptySessionId = await startSession(options.topicId, size);

    return emptySessionId
      ? { sessionId: emptySessionId, cards: [], isShort: true, size }
      : null;
  }

  const context: LearnerContext = {
    ...memory.context,
    personalisationEnabled: options.personalisationEnabled,
    preferredMinutes: options.preferredMinutes,
    now: options.now ?? Date.now(),
  };

  const ranked = rankCandidates(candidates, context, config);
  const assembled = assembleSession(ranked, config, {
    size,
    declaredTopicIds: context.declaredTopicIds,
  });

  const sessionId = await startSession(options.topicId, size);

  if (!sessionId) {
    return null;
  }

  await recordRecommendations(
    sessionId,
    assembled.items.map((item) => ({
      contentId: item.candidate.contentId,
      position: item.position,
      score: item.score,
      components: item.components,
      isDiscovery: item.isDiscovery,
      surface: "feed",
    })),
  );

  // The full card text comes from the catalogue module, so the feed never
  // reaches into content tables itself.
  const cards: FeedCard[] = [];

  for (const item of assembled.items) {
    const card = await findPublishedCardById(item.candidate.contentId);

    if (card) {
      cards.push({ ...card, position: item.position, isDiscovery: item.isDiscovery });
    }
  }

  return { sessionId, cards, isShort: assembled.isShort, size };
}

export async function explainRecommendation(
  sessionId: string,
  contentId: string,
  topicName: string,
  personalisationEnabled: boolean,
): Promise<string[]> {
  const [config, logged] = await Promise.all([
    loadActiveConfig(),
    loadRecommendationComponents(sessionId, contentId),
  ]);

  // Without the logged components there is nothing truthful to say, so we
  // say that rather than inventing a reason.
  if (!config || !logged) {
    return ["We no longer have the record of why this was recommended."];
  }

  return explain(logged.components, config.weights as unknown as Record<string, number>, {
    topicName,
    isDiscovery: logged.isDiscovery,
    personalisationEnabled,
  }).reasons;
}

export async function finishSession(sessionId: string) {
  return endSession(sessionId);
}

export { loadActiveConfig, findPublishedCard };
