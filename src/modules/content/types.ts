export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  isHighImpact: boolean;
  topicCount: number;
};

export type Topic = {
  id: string;
  slug: string;
  name: string;
  categorySlug: string;
  categoryName: string;
};

export type CardStatus = "draft" | "pending" | "published" | "rejected" | "archived";
export type CardFormat = "article" | "video" | "podcast" | "course" | "tool" | "book";
export type CardLevel = "beginner" | "intermediate" | "advanced";

/** A value card as shown to a reader. */
export type Card = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  takeaways: string[];
  /** What to actually do with it. The difference between reading and value. */
  nextStep: string;
  source: {
    url: string;
    name: string;
    author: string | null;
  };
  topic: { slug: string; name: string };
  categorySlug: string;
  format: CardFormat;
  level: CardLevel;
  estimatedMinutes: number;
  isAiAssisted: boolean;
  isHighImpact: boolean;
  publishedAt: string | null;
};

/** A card in a queue or list, where the full text is not needed. */
export type CardSummary = {
  id: string;
  slug: string;
  title: string;
  status: CardStatus;
  topicName: string;
  level: CardLevel;
  estimatedMinutes: number;
  isHighImpact: boolean;
  isAiAssisted: boolean;
  linkCheckedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
};

// -------------------------------------------------- admin views ----------

/** A category as the admin sees it: including archived, with its topic count. */
export type CategoryAdmin = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  isHighImpact: boolean;
  archivedAt: string | null;
  topicCount: number;
};

export type TopicAdmin = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  categoryId: string;
  categoryName: string;
  archivedAt: string | null;
};

/** One version of a card, newest first in a history. */
export type CardVersion = {
  versionNo: number;
  title: string;
  summary: string;
  takeaways: string[];
  nextStep: string;
  sourceName: string;
  sourceAuthor: string | null;
  createdAt: string;
};

/** One recorded moderation action on a card. */
export type ModerationEvent = {
  action: string;
  reason: string | null;
  createdAt: string;
};

/** Everything the admin card page shows about one card. */
export type CardDetail = {
  id: string;
  slug: string;
  status: CardStatus;
  topicId: string;
  topicName: string;
  categoryName: string;
  level: CardLevel;
  format: CardFormat;
  estimatedMinutes: number;
  qualityScore: number;
  sourceUrl: string;
  isHighImpact: boolean;
  isAiAssisted: boolean;
  linkCheckedAt: string | null;
  publishedAt: string | null;
  rejectionReason: string | null;
  currentVersion: CardVersion | null;
  versions: CardVersion[];
  moderation: ModerationEvent[];
};

/** One line of the audit log, for the admin audit view. */
export type AuditEntry = {
  id: number;
  action: string;
  targetType: string;
  targetId: string | null;
  createdAt: string;
  hasActor: boolean;
};
