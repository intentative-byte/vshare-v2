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
