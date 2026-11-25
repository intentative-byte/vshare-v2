import "server-only";

import {
  assembleSession,
  explain,
  nextBestMove,
  rankCandidates,
  type LearnerContext,
  type NextBestFacts,
  type NextBestMove,
} from "@/modules/vai";
import type { Card } from "@/modules/content";
import { findPublishedCard, findPublishedCardById } from "@/modules/content/server";
import {
  endSession,
  loadActiveConfig,
  loadCandidates,
  loadRecommendationComponents,
  loadViewerMemory,
  recordRecommendations,
  recordReview,
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
  /**
   * Null for a visitor with no account. They still get a ranked session to
   * read; nothing is recorded about them until they do something that has
   * to persist.
   */
  sessionId: string | null;
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
  /**
   * False for a visitor with no account: build and return the session, but
   * record nothing. Reading is not an action that requires persistence.
   */
  persist: boolean;
};

export async function buildSession(options: BuildSessionOptions): Promise<FeedSession | null> {
  const config = await loadActiveConfig();

  if (!config) {
    return null;
  }

  const size = options.size ?? config.params.sessionSize;
  // With no account there is no memory to load, and asking for it would
  // create nothing useful.
  const memory = options.persist
    ? await loadViewerMemory(config.params.repeatWindowHours)
    : {
        context: {
          declaredTopicIds: options.topicId ? [options.topicId] : [],
          affinityByTopic: {},
          levelByTopic: {},
          impressionsByContent: {},
          recentSourceNames: [],
        },
        excludeIds: [] as string[],
      };

  const candidates = await loadCandidates({
    topicId: options.topicId,
    excludeIds: memory.excludeIds,
  });

  // An empty pool is a real answer, not an error: the catalogue may simply
  // have nothing left for this person right now.
  if (candidates.length === 0) {
    const emptySessionId = options.persist ? await startSession(options.topicId, size) : null;

    return { sessionId: emptySessionId, cards: [], isShort: true, size };
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

  const sessionId = options.persist ? await startSession(options.topicId, size) : null;

  if (sessionId) {
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
  }

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

/**
 * The one card to show a visitor who has just chosen a topic.
 *
 * No session, no account, nothing recorded: this is the reading step, and a
 * visitor who only reads is still anonymous. An account appears when they
 * do something that has to survive — which is pressing "Got it".
 */
export async function firstWinCard(topicId: string): Promise<Card | null> {
  const config = await loadActiveConfig();

  if (!config) {
    return null;
  }

  const candidates = await loadCandidates({ topicId, excludeIds: [], limit: 50 });

  if (candidates.length === 0) {
    return null;
  }

  // A first card should be short, well reviewed and for a beginner. The
  // ranker already prefers exactly that when nothing is known about anyone.
  const ranked = rankCandidates(
    candidates,
    {
      declaredTopicIds: [topicId],
      affinityByTopic: {},
      levelByTopic: {},
      impressionsByContent: {},
      recentSourceNames: [],
      preferredMinutes: 10,
      personalisationEnabled: true,
      now: Date.now(),
    },
    config,
  );

  const best = ranked[0];
  return best ? findPublishedCardById(best.candidate.contentId) : null;
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

/**
 * The next best move, built from the same ranker the feed uses plus what
 * the person has started and saved.
 */
export async function buildNextBestMove(
  facts: Pick<NextBestFacts, "startedNotFinished" | "savedNotOpened">,
  options: { personalisationEnabled: boolean; preferredMinutes: number },
): Promise<NextBestMove> {
  const config = await loadActiveConfig();
  const memory = config ? await loadViewerMemory(config.params.repeatWindowHours) : null;

  let topCandidate: NextBestFacts["topCandidate"] = null;
  let completedCount = 0;

  if (config && memory) {
    completedCount = memory.excludeIds.length;

    const candidates = await loadCandidates({
      topicId: null,
      excludeIds: memory.excludeIds,
      limit: 50,
    });

    const ranked = rankCandidates(
      candidates,
      {
        ...memory.context,
        personalisationEnabled: options.personalisationEnabled,
        preferredMinutes: options.preferredMinutes,
        now: Date.now(),
      },
      config,
    );

    const best = ranked[0];

    if (best) {
      const card = await findPublishedCardById(best.candidate.contentId);

      if (card) {
        topCandidate = {
          contentId: card.id,
          title: card.title,
          topicName: card.topic.name,
        };
      }
    }
  }

  return nextBestMove({
    ...facts,
    topCandidate,
    declaredTopicCount: memory?.context.declaredTopicIds.length ?? 0,
    completedCount,
    now: Date.now(),
  });
}

export async function submitSessionReview(input: {
  sessionId: string;
  useful?: boolean;
  rating?: number;
  preferredFormat?: string;
  note?: string;
}): Promise<string | null> {
  return recordReview(input);
}

export async function finishSession(sessionId: string) {
  return endSession(sessionId);
}

export { loadActiveConfig, findPublishedCard };
