/**
 * The approved launch taxonomy.
 *
 * Eight categories, each with its topics. This is the same data the
 * `categories` and `topics` tables are seeded with
 * (supabase/seed/taxonomy.sql); the system is database-driven and
 * expandable from Milestone 3, when administrators edit it and the UI reads
 * it from the database instead of from this file.
 *
 * Categories marked high impact need a named human reviewer before anything
 * is published in them, and carry an "educational, not advice" notice
 * (docs/VSHARES_MASTER_SPEC.md section B3).
 */

export type Topic = {
  slug: string;
  name: string;
};

export type Category = {
  slug: string;
  name: string;
  /** One sentence, shown on Explore. */
  description: string;
  isHighImpact: boolean;
  topics: Topic[];
};

export const categories: Category[] = [
  {
    slug: "technology-and-ai",
    name: "Technology and AI",
    description: "How the tools shaping your work actually function, and how to use them well.",
    isHighImpact: false,
    topics: [
      { slug: "ai-foundations", name: "AI foundations" },
      { slug: "working-with-ai-tools", name: "Working with AI tools" },
      { slug: "software-and-building", name: "Software and building" },
      { slug: "data-and-privacy", name: "Data and privacy" },
      { slug: "security-basics", name: "Security basics" },
    ],
  },
  {
    slug: "career-development",
    name: "Career Development",
    description: "Finding, choosing and growing in work that suits you.",
    isHighImpact: false,
    topics: [
      { slug: "job-search", name: "Job search" },
      { slug: "interviews", name: "Interviews" },
      { slug: "negotiation", name: "Negotiation" },
      { slug: "management-and-leadership", name: "Management and leadership" },
      { slug: "career-changes", name: "Career changes" },
    ],
  },
  {
    slug: "entrepreneurship",
    name: "Entrepreneurship",
    description: "Starting something small and finding out whether it works.",
    isHighImpact: false,
    topics: [
      { slug: "finding-an-idea", name: "Finding an idea" },
      { slug: "talking-to-customers", name: "Talking to customers" },
      { slug: "pricing-and-revenue", name: "Pricing and revenue" },
      { slug: "marketing-basics", name: "Marketing basics" },
      { slug: "running-a-small-business", name: "Running a small business" },
    ],
  },
  {
    slug: "personal-finance",
    name: "Personal Finance",
    description: "Understanding money well enough to make your own decisions.",
    isHighImpact: true,
    topics: [
      { slug: "budgeting", name: "Budgeting" },
      { slug: "debt-and-credit", name: "Debt and credit" },
      { slug: "saving-and-investing-basics", name: "Saving and investing basics" },
      { slug: "tax-and-pensions-uk", name: "Tax and pensions (UK)" },
      { slug: "avoiding-scams", name: "Avoiding scams" },
    ],
  },
  {
    slug: "productivity",
    name: "Productivity",
    description: "Getting the things that matter done, without theatre.",
    isHighImpact: false,
    topics: [
      { slug: "attention-and-focus", name: "Attention and focus" },
      { slug: "planning-and-prioritising", name: "Planning and prioritising" },
      { slug: "habits", name: "Habits" },
      { slug: "note-taking", name: "Note taking" },
      { slug: "meetings-and-email", name: "Meetings and email" },
    ],
  },
  {
    slug: "communication",
    name: "Communication",
    description: "Being understood, in writing and in the room.",
    isHighImpact: false,
    topics: [
      { slug: "clear-writing", name: "Clear writing" },
      { slug: "speaking-and-presenting", name: "Speaking and presenting" },
      { slug: "difficult-conversations", name: "Difficult conversations" },
      { slug: "listening", name: "Listening" },
      { slug: "persuasion-and-influence", name: "Persuasion and influence" },
    ],
  },
  {
    slug: "health-and-wellbeing",
    name: "Health and Wellbeing",
    description: "Practical, evidence-led basics for sleep, movement and mind.",
    isHighImpact: true,
    topics: [
      { slug: "sleep", name: "Sleep" },
      { slug: "movement-and-strength", name: "Movement and strength" },
      { slug: "nutrition-basics", name: "Nutrition basics" },
      { slug: "stress-and-mood", name: "Stress and mood" },
      { slug: "screens-and-attention", name: "Screens and attention" },
    ],
  },
  {
    slug: "learning-how-to-learn",
    name: "Learning How to Learn",
    description: "Methods that make everything else on VSHARES stick.",
    isHighImpact: false,
    topics: [
      { slug: "memory-and-recall", name: "Memory and recall" },
      { slug: "spaced-repetition", name: "Spaced repetition" },
      { slug: "deliberate-practice", name: "Deliberate practice" },
      { slug: "reading-and-comprehension", name: "Reading and comprehension" },
      { slug: "study-planning", name: "Study planning" },
    ],
  },
];

export function findCategory(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug);
}

export function allTopics(): Array<Topic & { categorySlug: string; categoryName: string }> {
  return categories.flatMap((category) =>
    category.topics.map((topic) => ({
      ...topic,
      categorySlug: category.slug,
      categoryName: category.name,
    })),
  );
}

export function findTopic(slug: string) {
  return allTopics().find((topic) => topic.slug === slug);
}

/** Topics offered on the home page as first entry points. */
export const featuredTopicSlugs = [
  "ai-foundations",
  "budgeting",
  "attention-and-focus",
  "clear-writing",
  "sleep",
  "job-search",
  "finding-an-idea",
  "memory-and-recall",
] as const;
