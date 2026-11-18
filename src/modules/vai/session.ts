import type { Candidate, RankingConfig, ScoredCandidate } from "./ranker";

/**
 * Assembling a finite session.
 *
 * A session is a fixed number of cards and then a stopping point. There is
 * no refill, no infinite scroll and no "just one more". The design question
 * is not how to keep someone here; it is how to make the seven cards worth
 * the time.
 */

export type SessionItem = {
  candidate: Candidate;
  position: number;
  score: number;
  components: Record<string, number>;
  /** One slot per session is deliberately outside the person's usual topics. */
  isDiscovery: boolean;
};

export type AssembledSession = {
  items: SessionItem[];
  /** Fewer than asked for, because the catalogue ran out. */
  isShort: boolean;
};

function topicCountsRespected(
  chosen: SessionItem[],
  next: ScoredCandidate,
  maxConsecutive: number,
): boolean {
  if (maxConsecutive <= 0) {
    return true;
  }

  const tail = chosen.slice(-maxConsecutive);

  return (
    tail.length < maxConsecutive ||
    !tail.every((item) => item.candidate.topicId === next.candidate.topicId)
  );
}

function sourceCountRespected(
  chosen: SessionItem[],
  next: ScoredCandidate,
  maxPerSource: number,
): boolean {
  const used = chosen.filter(
    (item) => item.candidate.sourceName === next.candidate.sourceName,
  ).length;

  return used < maxPerSource;
}

/**
 * Picks the session from the ranked list.
 *
 * Takes the best candidate that does not break the variety rules: no long
 * run from one topic, no more than a couple from any one source. If nothing
 * satisfies them, the rules are relaxed rather than returning a short
 * session — variety is a preference, having something to read is not.
 *
 * One slot is given to the best card from outside the person's declared
 * topics, marked so the interface can say why it is there.
 */
export function assembleSession(
  ranked: ScoredCandidate[],
  config: RankingConfig,
  options: { size?: number; declaredTopicIds?: string[] } = {},
): AssembledSession {
  const size = Math.max(1, options.size ?? config.params.sessionSize);
  const declared = options.declaredTopicIds ?? [];
  const { maxConsecutiveSameTopic, maxPerSource, discoveryPosition } = config.params;

  const remaining = [...ranked];
  const items: SessionItem[] = [];

  const discoveryIndex =
    declared.length > 0 && discoveryPosition >= 1 && discoveryPosition <= size
      ? discoveryPosition - 1
      : -1;

  while (items.length < size && remaining.length > 0) {
    const position = items.length;
    const wantsDiscovery = position === discoveryIndex;

    let pickIndex = -1;

    if (wantsDiscovery) {
      // The best card from a topic the person has not asked for.
      pickIndex = remaining.findIndex(
        (entry) =>
          !declared.includes(entry.candidate.topicId) &&
          topicCountsRespected(items, entry, maxConsecutiveSameTopic) &&
          sourceCountRespected(items, entry, maxPerSource),
      );
    }

    if (pickIndex === -1) {
      pickIndex = remaining.findIndex(
        (entry) =>
          topicCountsRespected(items, entry, maxConsecutiveSameTopic) &&
          sourceCountRespected(items, entry, maxPerSource),
      );
    }

    // Variety is a preference; an empty slot is not an improvement.
    if (pickIndex === -1) {
      pickIndex = 0;
    }

    const [picked] = remaining.splice(pickIndex, 1);

    if (!picked) {
      break;
    }

    items.push({
      candidate: picked.candidate,
      position: position + 1,
      score: picked.score,
      components: picked.components,
      isDiscovery: wantsDiscovery && !declared.includes(picked.candidate.topicId),
    });
  }

  return { items, isShort: items.length < size };
}
