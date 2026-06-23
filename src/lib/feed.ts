import type { ContentEventType, FeedItem, Profile, Topic, UserTopicPreference } from "@/types/domain";

type FetchJsonOptions = RequestInit & {
  next?: never;
};

async function fetchJson<T>(input: RequestInfo | URL, init?: FetchJsonOptions): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export type FeedResponse = {
  items: FeedItem[];
  nextCursor: string | null;
  activeTopicId: string | null;
};

export function getFeed(params: { topicId?: string | null; cursor?: string | null; signal?: AbortSignal }) {
  const searchParams = new URLSearchParams();

  if (params.topicId) searchParams.set("topicId", params.topicId);
  if (params.cursor) searchParams.set("cursor", params.cursor);

  return fetchJson<FeedResponse>(`/api/feed?${searchParams.toString()}`, {
    method: "GET",
    signal: params.signal
  });
}

export type TopicsResponse = {
  topics: Topic[];
  preferences: UserTopicPreference[];
  selectedTopicId: string | null;
};

export function getTopics() {
  return fetchJson<TopicsResponse>("/api/topics");
}

export function selectTopic(topicId: string) {
  return fetchJson<TopicsResponse>("/api/topics", {
    method: "PATCH",
    body: JSON.stringify({ topicId, selected: true })
  });
}

export function sendContentEvent(input: {
  contentId: string;
  eventType: ContentEventType;
  watchTimeSeconds?: number;
  metadata?: Record<string, unknown>;
}) {
  return fetchJson<{ ok: true }>("/api/analytics", {
    method: "POST",
    body: JSON.stringify({
      watchTimeSeconds: 0,
      metadata: {},
      ...input
    })
  });
}

export function getProfile() {
  return fetchJson<{
    profile: Profile;
    topics: Topic[];
    preferences: UserTopicPreference[];
  }>("/api/profile");
}

export function updateProfile(input: {
  displayName?: string;
  selectedTopicId?: string;
  onboardingComplete?: boolean;
}) {
  return fetchJson<{ profile: Profile }>("/api/profile", {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}
