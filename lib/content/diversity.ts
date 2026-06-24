import type { RankedContent } from "@/lib/feed-ranking/rank-content";

const maxConsecutiveSourceItems = 2;
const maxConsecutiveTopicItems = 3;

function getPrimaryTopic(item: RankedContent) {
  return item.content.interests[0] ?? "Other";
}

function violatesDiversityRules(candidate: RankedContent, selectedItems: RankedContent[]) {
  const recentSourceItems = selectedItems.slice(-maxConsecutiveSourceItems);
  const recentTopicItems = selectedItems.slice(-maxConsecutiveTopicItems);
  const candidateSourceId = candidate.content.source.id;
  const candidateTopic = getPrimaryTopic(candidate);

  const sourceWouldRepeat =
    recentSourceItems.length === maxConsecutiveSourceItems &&
    recentSourceItems.every((item) => item.content.source.id === candidateSourceId);
  const topicWouldRepeat =
    recentTopicItems.length === maxConsecutiveTopicItems &&
    recentTopicItems.every((item) => getPrimaryTopic(item) === candidateTopic);

  return sourceWouldRepeat || topicWouldRepeat;
}

export function applyFeedDiversity(rankedContent: RankedContent[]) {
  const pendingItems = [...rankedContent];
  const selectedItems: RankedContent[] = [];

  while (pendingItems.length) {
    const candidateIndex = pendingItems.findIndex((item) => !violatesDiversityRules(item, selectedItems));
    const nextIndex = candidateIndex === -1 ? 0 : candidateIndex;
    const [nextItem] = pendingItems.splice(nextIndex, 1);
    selectedItems.push(nextItem);
  }

  return selectedItems;
}
