export type Profile = {
  id: string;
  username: string;
  full_name: string | null;
  headline: string | null;
  avatar_url: string | null;
  interests: string[];
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: string;
  author_id: string;
  title: string;
  summary: string;
  url: string | null;
  content_type: "article" | "video" | "course" | "podcast" | "thread";
  topics: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  estimated_minutes: number;
  created_at: string;
  profile?: Pick<Profile, "username" | "full_name" | "avatar_url" | "headline"> | null;
};

export type Preference = {
  id: string;
  user_id: string;
  topics: string[];
  goals: string[];
  daily_minutes: number;
  created_at: string;
  updated_at: string;
};

export type FeedItem = Post & {
  relevance: number;
};
