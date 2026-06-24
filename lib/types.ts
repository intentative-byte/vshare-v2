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

export type Interest =
  | "AI"
  | "Business"
  | "Finance"
  | "Fitness"
  | "Science"
  | "Technology"
  | "Fashion"
  | "Music"
  | "Entrepreneurship"
  | "Other";

export type LearningFormat = "article" | "video" | "audio" | "challenge" | "brief";

export type ContentType =
  | "article"
  | "video"
  | "podcast"
  | "thread"
  | "post"
  | "framework"
  | "research_paper"
  | "tutorial";

export type ContentQualityScore = {
  relevanceScore: number;
  engagementScore: number;
  freshnessScore: number;
  authorityScore: number;
  overallContentScore: number;
};

export type ContentPurpose = {
  skill: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  topic: Interest;
  outcome: string;
};

export type CreatorProfile = {
  id: string;
  name: string;
  username: string;
  bio: string;
  topics: Interest[];
  followerCount: number;
  learningScore: number;
  contentCount: number;
};

export type LearningContent = {
  id: string;
  title: string;
  summary: string;
  interests: Interest[];
  format: LearningFormat;
  durationMinutes: number;
  level: "starter" | "intermediate" | "deep";
  createdAt: string;
  sourceLabel: string;
  media: {
    kind: "video" | "audio" | "text";
    status: "available" | "planned";
  };
};

export type NormalizedContent = LearningContent & {
  contentType: ContentType;
  source: {
    id: string;
    name: string;
    authorityScore: number;
  };
  url: string | null;
  publishedAt: string;
  ingestedAt: string;
  tags: string[];
  quality: ContentQualityScore;
  purpose: ContentPurpose;
  creatorId: string;
  isUserGenerated: boolean;
};

export type UserSignalType =
  | "topic_selected"
  | "view_started"
  | "content_viewed"
  | "watch_time"
  | "content_completed"
  | "scroll_away"
  | "content_skipped"
  | "content_saved"
  | "content_unsaved"
  | "content_liked"
  | "content_unliked"
  | "not_interested"
  | "content_shared"
  | "replay"
  | "search"
  | "explore_activity"
  | "profile_activity"
  | "path_followed"
  | "creator_followed"
  | "creator_unfollowed"
  | "contribution_created";

export type UserSignal = {
  id: string;
  type: UserSignalType;
  contentId?: string;
  creatorId?: string;
  topic?: Interest;
  query?: string;
  value?: number;
  occurredAt: string;
};

export type ContentEngagement = {
  starts: number;
  views: number;
  watchSeconds: number;
  completions: number;
  scrollAways: number;
  skips: number;
  saves: number;
  likes: number;
  shares: number;
  replays: number;
  notInterested: number;
  lastStartedAt: string | null;
  lastViewedAt: string | null;
  lastCompletedAt: string | null;
  lastSkippedAt: string | null;
};

export type SessionMemory = {
  lastViewedPosition: number;
  lastViewedContentId: string | null;
  lastActiveTopic: Interest | null;
  lastSearchQuery: string;
  lastFeedVisitAt: string | null;
  lastExploreVisitAt: string | null;
  lastProfileVisitAt: string | null;
};

export type KnowledgeScore = {
  awarenessScore: number;
  understandingScore: number;
  applicationScore: number;
  masteryScore: number;
};

export type LearningPath = {
  id: string;
  title: string;
  description: string;
  primaryInterest: Interest;
  contentIds: string[];
};

export type ContributionType = "short_insight" | "framework" | "thread" | "resource_link" | "article_summary" | "learning_note";

export type SubmissionQualityScore = {
  qualityScore: number;
  topicMatchScore: number;
  communityScore: number;
  overallScore: number;
};

export type UserContribution = {
  id: string;
  type: ContributionType;
  title: string;
  body: string;
  url: string | null;
  topics: Interest[];
  createdAt: string;
  quality: SubmissionQualityScore;
};

export type LearningState = {
  interests: Interest[];
  interestScores: Record<Interest, number>;
  viewedContentIds: string[];
  savedContentIds: string[];
  likedContentIds: string[];
  completedContentIds: string[];
  skippedContentIds: string[];
  notInterestedContentIds: string[];
  followedPathIds: string[];
  followedCreatorIds: string[];
  userContributions: UserContribution[];
  viewedAtById: Record<string, string>;
  contentEngagement: Record<string, ContentEngagement>;
  signals: UserSignal[];
  memory: SessionMemory;
  vaiMode: "silent" | "partner" | "coach";
  streak: number;
  lastActiveDate: string | null;
  onboardedAt: string | null;
};
