export type Topic = {
  id: string;
  slug: string;
  name: string;
  description: string;
  color: string;
  is_active: boolean;
};

export type UserTopicPreference = {
  topic_id: string;
  weight: number;
  selected: boolean;
  muted: boolean;
  last_selected_at: string | null;
  topics?: Topic;
};

export type Profile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  onboarding_complete: boolean;
  selected_topic_id: string | null;
};

export type FeedItem = {
  id: string;
  topic_id: string;
  topic_name: string;
  title: string;
  summary: string;
  source_name: string;
  source_url: string | null;
  media_url: string | null;
  duration_seconds: number;
  quality_score: number;
  popularity_score: number;
  published_at: string;
  next_cursor: string;
};

export type ContentEventType = "view" | "watch_time" | "save" | "like" | "skip";

export type ApiError = {
  error: string;
  details?: unknown;
};
