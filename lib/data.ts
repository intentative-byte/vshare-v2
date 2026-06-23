import type { FeedItem, Post, Profile } from "@/lib/types";

export const topicOptions = [
  "AI",
  "Product",
  "Design",
  "Startups",
  "Engineering",
  "Leadership",
  "Marketing",
  "Data",
] as const;

export const goalOptions = [
  "Build a portfolio",
  "Grow a startup",
  "Learn AI tools",
  "Improve product thinking",
  "Become a better engineer",
] as const;

export const demoProfiles: Profile[] = [
  {
    id: "demo-lina",
    username: "lina",
    full_name: "Lina Chen",
    headline: "Product strategist exploring AI-native workflows",
    avatar_url: null,
    interests: ["AI", "Product", "Startups"],
    created_at: "2026-06-10T12:00:00.000Z",
    updated_at: "2026-06-10T12:00:00.000Z",
  },
  {
    id: "demo-marcus",
    username: "marcus",
    full_name: "Marcus Okafor",
    headline: "Engineering lead focused on learning systems",
    avatar_url: null,
    interests: ["Engineering", "Leadership", "Data"],
    created_at: "2026-06-11T12:00:00.000Z",
    updated_at: "2026-06-11T12:00:00.000Z",
  },
];

export const demoPosts: FeedItem[] = [
  {
    id: "demo-1",
    author_id: "demo-lina",
    title: "A practical map for choosing AI product ideas",
    summary:
      "A framework for matching user pain, proprietary context, and automation leverage before committing to an AI feature.",
    url: "https://example.com/ai-product-map",
    content_type: "article",
    topics: ["AI", "Product", "Startups"],
    difficulty: "intermediate",
    estimated_minutes: 12,
    relevance: 96,
    created_at: "2026-06-18T14:30:00.000Z",
    profile: {
      username: "lina",
      full_name: "Lina Chen",
      avatar_url: null,
      headline: "Product strategist exploring AI-native workflows",
    },
  },
  {
    id: "demo-2",
    author_id: "demo-marcus",
    title: "Designing feeds that teach instead of distract",
    summary:
      "How progressive disclosure, spaced repetition, and feedback loops can make content feeds feel productive.",
    url: "https://example.com/learning-feeds",
    content_type: "video",
    topics: ["Design", "Engineering", "Data"],
    difficulty: "advanced",
    estimated_minutes: 21,
    relevance: 91,
    created_at: "2026-06-17T09:15:00.000Z",
    profile: {
      username: "marcus",
      full_name: "Marcus Okafor",
      avatar_url: null,
      headline: "Engineering lead focused on learning systems",
    },
  },
  {
    id: "demo-3",
    author_id: "demo-lina",
    title: "The 30-minute weekly learning review",
    summary:
      "A repeatable ritual for turning saved links into durable notes, actions, and follow-up questions.",
    url: "https://example.com/weekly-learning-review",
    content_type: "thread",
    topics: ["Leadership", "Product"],
    difficulty: "beginner",
    estimated_minutes: 7,
    relevance: 84,
    created_at: "2026-06-15T16:45:00.000Z",
    profile: {
      username: "lina",
      full_name: "Lina Chen",
      avatar_url: null,
      headline: "Product strategist exploring AI-native workflows",
    },
  },
];

export const emptyPostDraft: Pick<
  Post,
  "title" | "summary" | "url" | "content_type" | "topics" | "difficulty" | "estimated_minutes"
> = {
  title: "",
  summary: "",
  url: "",
  content_type: "article",
  topics: [],
  difficulty: "beginner",
  estimated_minutes: 10,
};
