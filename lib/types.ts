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
  skills: string[];
  expertise: string[];
  industries: string[];
  followerCount: number;
  learningScore: number;
  contentCount: number;
};

export type TrustScore = {
  learningTrustScore: number;
  creatorTrustScore: number;
  expertTrustScore: number;
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

export type CapabilityDimension = "knowledge" | "understanding" | "application" | "execution" | "teaching";

export type OutcomeType =
  | "built_project"
  | "started_business"
  | "got_job"
  | "passed_exam"
  | "lost_weight"
  | "learned_skill"
  | "earned_revenue"
  | "completed_certification"
  | "revenue"
  | "clients"
  | "jobs"
  | "promotions"
  | "skills"
  | "fitness"
  | "projects"
  | "education"
  | "salary_increase"
  | "certification"
  | "first_client"
  | "product_launch"
  | "audience_growth"
  | "skill_acquired"
  | "project_completed"
  | "framework_mastered"
  | "strength_gain"
  | "habit_consistency"
  | "income_growth"
  | "savings_growth"
  | "investment_milestone";

export type EvidenceType = "link" | "image" | "screenshot" | "document" | "pdf" | "video" | "note";

export type EvidenceAttachment = {
  id: string;
  type: EvidenceType;
  label: string;
  value: string;
  addedAt: string;
};

export type UserOutcome = {
  id: string;
  type: OutcomeType;
  status: "planned" | "started" | "in_progress" | "completed" | "validated";
  goal: string;
  action: string;
  title: string;
  description: string;
  topics: Interest[];
  evidenceIds: string[];
  confidence: "low" | "medium" | "high" | "verified";
  createdAt: string;
  updatedAt: string;
};

export type OutcomeIntelligenceScore = {
  executionScore: number;
  outcomeScore: number;
  improvementScore: number;
  outcomeVelocity: number;
  outcomeQuality: number;
  outcomeFrequency: number;
  outcomeConsistency: number;
  combinedOutcomeScore: number;
};

export type OutcomeExecutionRecord = {
  id: string;
  outcomeId: string;
  type: "attempt" | "success" | "failure" | "iteration";
  note: string;
  createdAt: string;
};

export type ConceptActionStage = "learned" | "attempted" | "applied" | "repeated" | "mastered";

export type ConceptProgress = {
  skill: string;
  topic: Interest;
  stage: ConceptActionStage;
  repetitions: number;
  updatedAt: string;
};

export type CapabilityScore = {
  learningScore: number;
  applicationScore: number;
  executionScore: number;
  evidenceScore: number;
  capabilityScore: number;
  capabilityDelta: number;
};

export type GoalType = "learn" | "career" | "business" | "health" | "financial" | "project";

export type GoalPriority = "low" | "medium" | "high" | "critical";

export type GoalDifficulty = "easy" | "moderate" | "hard" | "extreme";

export type UserGoal = {
  id: string;
  type: GoalType;
  title: string;
  desiredOutcome: string;
  topics: Interest[];
  priority: GoalPriority;
  difficulty: GoalDifficulty;
  category: GoalType;
  deadline: string | null;
  createdAt: string;
  targetDate: string | null;
};

export type ProjectStatus = "active" | "completed" | "abandoned";

export type UserProject = {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  skills: string[];
  topics: Interest[];
  createdAt: string;
  updatedAt: string;
};

export type TimeAllocation = {
  learning: number;
  building: number;
  practicing: number;
  teaching: number;
};

export type GrowthScore = {
  knowledgeGrowth: number;
  capabilityGrowth: number;
  executionGrowth: number;
  goalProgress: number;
  consistency: number;
  personalGrowthScore: number;
};

export type PersonalResources = {
  time: number;
  energy: number;
  attention: number;
  focus: number;
  money: number;
};

export type EconomyAllocation = {
  learning: number;
  outreach: number;
  product: number;
  building: number;
  practicing: number;
  teaching: number;
  recovery: number;
};

export type EconomyLeverageItem = {
  type: "project" | "skill" | "goal" | "action";
  label: string;
  potentialImpact: number;
  difficulty: number;
  timeRequired: number;
  outcomeProbability: number;
  leverageScore: number;
};

export type DecisionType = "career" | "business" | "health" | "learning" | "financial" | "personal";

export type DecisionOption = {
  id: string;
  label: string;
  upside: string;
  downside: string;
  risk: number;
  leverage: number;
};

export type DecisionRecord = {
  id: string;
  type: DecisionType;
  decision: string;
  reason: string;
  desiredOutcome: string;
  options: DecisionOption[];
  chosenOptionId: string;
  recommendation: string;
  outcome: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type DecisionQualityScore = {
  clarityScore: number;
  optionQualityScore: number;
  riskAwarenessScore: number;
  leverageScore: number;
  outcomeScore: number;
  decisionQualityScore: number;
};

export type BottleneckType =
  | "knowledge_bottleneck"
  | "skill_bottleneck"
  | "execution_bottleneck"
  | "consistency_bottleneck"
  | "resource_bottleneck";

export type Bottleneck = {
  type: BottleneckType;
  label: string;
  impact: number;
  reason: string;
};

export type LeverageScore = {
  potentialImpact: number;
  requiredEffort: number;
  confidence: number;
  timeToOutcome: number;
  leverageScore: number;
};

export type DecisionRecommendationMemory = {
  id: string;
  recommendation: string;
  userAction: string | null;
  result: string | null;
  createdAt: string;
  resolvedAt: string | null;
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
  outcomes: UserOutcome[];
  outcomeExecutions: OutcomeExecutionRecord[];
  evidence: EvidenceAttachment[];
  conceptProgress: Record<string, ConceptProgress>;
  goals: UserGoal[];
  projects: UserProject[];
  timeAllocation: TimeAllocation;
  decisions: DecisionRecord[];
  vaiDecisionMemory: DecisionRecommendationMemory[];
  viewedAtById: Record<string, string>;
  contentEngagement: Record<string, ContentEngagement>;
  signals: UserSignal[];
  memory: SessionMemory;
  vaiMode: "silent" | "partner" | "coach" | "strategist" | "operator";
  streak: number;
  lastActiveDate: string | null;
  onboardedAt: string | null;
};
