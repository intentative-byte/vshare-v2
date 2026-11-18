/**
 * Deterministic fixtures for the local draft-generation demonstration and tests.
 *
 * The draft inputs reuse REAL, reputable sources already curated in the seed
 * (NHS, NCSC, MoneyHelper, Google, National Careers Service, GOV.UK, a named
 * expert) plus NASA for a science example. No supporting QUOTES are supplied,
 * because the pages were not fetched in this environment — so every claim is
 * honestly marked "cited_pending_verification" and routed to a human fact-check.
 * Nothing here is asserted as verified.
 *
 * The trend observations are explicitly illustrative fixtures, not live data.
 */
import type { DraftInput, TrendObservation, TrendSourceAdapter } from "./types";
import type { ClassifyRule } from "./tai";

export const DEMO_DRAFTS: DraftInput[] = [
  {
    slug: "building-a-first-monthly-budget",
    category: "personal-finance",
    topic: "budgeting",
    level: "beginner",
    format: "tool",
    objective: "Build a first monthly budget from real income and fixed costs.",
    title: "A budget planner that does the arithmetic for you",
    summary:
      "A free budgeting tool from the UK government-backed money guidance service. It walks through income, fixed costs and spending, then shows what is left and where it goes. It is general information rather than advice about your own circumstances.",
    takeaways: [
      "Writing fixed costs down is what makes them negotiable.",
      "A budget is a plan for money you have, not a prediction of money you might get.",
    ],
    nextStep: "List every fixed monthly cost you have before the end of this week.",
    estimatedMinutes: 20,
    source: { url: "https://www.moneyhelper.org.uk/en/everyday-money/budgeting/budget-planner", publisher: "MoneyHelper" },
  },
  {
    slug: "machine-learning-crash-course",
    category: "technology-and-ai",
    topic: "ai-foundations",
    level: "beginner",
    format: "course",
    objective: "Understand how machine-learning models are trained and evaluated.",
    title: "A structured first course in machine learning",
    summary:
      "A free, self-paced course that introduces how machine learning models are trained and evaluated, with short videos and exercises rather than mathematics for its own sake. It is aimed at people who write software or work alongside those who do.",
    takeaways: [
      "Training a model means adjusting it until its predictions match known answers closely enough.",
      "Most of the work in practice is preparing data, not choosing an algorithm.",
    ],
    nextStep: "Work through the first module and write down one term you had not met before.",
    estimatedMinutes: 25,
    source: { url: "https://developers.google.com/machine-learning/crash-course", publisher: "Google" },
  },
  {
    slug: "staying-secure-online-basics",
    category: "technology-and-ai",
    topic: "security-basics",
    level: "beginner",
    format: "article",
    objective: "Take the few security steps that prevent most ordinary attacks.",
    title: "The handful of security steps that matter most",
    summary:
      "The UK National Cyber Security Centre's short guidance on protecting everyday accounts. It is deliberately a small number of steps, chosen because they prevent the majority of ordinary attacks, rather than an exhaustive list nobody follows.",
    takeaways: [
      "Protecting the email account that can reset every other password matters most.",
      "Two-factor authentication blocks most attacks that start with a stolen password.",
    ],
    nextStep: "Turn on two-factor authentication for your main email account today.",
    estimatedMinutes: 10,
    source: { url: "https://www.ncsc.gov.uk/collection/top-tips-for-staying-secure-online", publisher: "National Cyber Security Centre" },
  },
  {
    slug: "getting-to-sleep-nhs-guidance",
    category: "health-and-wellbeing",
    topic: "sleep",
    level: "beginner",
    format: "article",
    objective: "Apply evidence-led basics that help with getting to sleep.",
    title: "What actually helps when you cannot sleep",
    summary:
      "NHS guidance on sleep: regular timing, winding down, and when poor sleep is worth seeing a doctor about. It is short, free of supplements and gadgets, and clear about the point at which self-help is not the answer. General information, not medical advice.",
    takeaways: [
      "A consistent wake time does more for sleep than a consistent bedtime.",
      "Persistent sleep problems are worth raising with a doctor rather than managing alone.",
    ],
    nextStep: "Set one alarm for the same wake time every day this week, including the weekend.",
    estimatedMinutes: 7,
    source: { url: "https://www.nhs.uk/live-well/sleep-and-tiredness/how-to-get-to-sleep/", publisher: "NHS" },
  },
  {
    slug: "preparing-for-an-interview",
    category: "career-development",
    topic: "interviews",
    level: "beginner",
    format: "article",
    objective: "Prepare structured interview answers from real experience.",
    title: "Preparing for an interview without guessing",
    summary:
      "Free UK careers service guidance on preparing for interviews: what to research, how to structure answers about your experience, and what to ask at the end. It is practical and free of the confidence-as-a-substitute-for-preparation advice common elsewhere.",
    takeaways: [
      "A structured answer about a real situation beats a general claim about yourself.",
      "The questions you ask are part of what is being assessed.",
    ],
    nextStep: "Write out one example of your work using situation, task, action and result.",
    estimatedMinutes: 12,
    source: { url: "https://nationalcareers.service.gov.uk/careers-advice/interview-advice", publisher: "National Careers Service" },
  },
  {
    slug: "setting-up-a-business-uk",
    category: "entrepreneurship",
    topic: "running-a-small-business",
    level: "beginner",
    format: "article",
    objective: "Know the real first steps to set up a business in the UK.",
    title: "The actual steps to set up a business in the UK",
    summary:
      "The official starting point for setting up in the UK: choosing a structure, registering, and the records you have to keep. It answers the administrative questions that are easy to get wrong and expensive to fix later.",
    takeaways: [
      "The legal structure you choose changes your tax and your personal liability.",
      "Registration deadlines start from when you begin trading, not when you incorporate.",
    ],
    nextStep: "Decide whether you would be a sole trader or a limited company, and write down why.",
    estimatedMinutes: 15,
    source: { url: "https://www.gov.uk/set-up-business", publisher: "GOV.UK" },
  },
  {
    slug: "spaced-repetition-for-memory",
    category: "learning-how-to-learn",
    topic: "spaced-repetition",
    level: "intermediate",
    format: "article",
    objective: "Use spaced review to remember what you learn for longer.",
    title: "Why reviewing at increasing intervals works",
    summary:
      "A long essay on using spaced repetition seriously: how review schedules affect what is retained, what makes a good prompt, and where the method stops helping. It is considerably more thoughtful than the usual flashcard advice, and honest about the effort involved.",
    takeaways: [
      "Reviewing just before you would have forgotten is what strengthens memory.",
      "A good prompt asks for one specific thing, not a whole topic at once.",
    ],
    nextStep: "Turn one thing you learned this week into a single question and answer.",
    estimatedMinutes: 30,
    source: { url: "https://augmentingcognition.com/ltm.html", publisher: "Michael Nielsen", author: "Michael Nielsen" },
  },
  {
    slug: "reading-the-evidence-on-climate",
    category: "science-and-nature",
    topic: "climate-and-weather-basics",
    level: "beginner",
    format: "article",
    objective: "Read the primary evidence behind a warming climate.",
    title: "The evidence for a changing climate, from the primary source",
    summary:
      "NASA's plain summary of the physical evidence for climate change: temperature records, sea level, ice and the measurements behind them. It links to the underlying datasets, so a reader can check the claims rather than take them on trust.",
    takeaways: [
      "The clearest evidence is a long record of measurements, not any single hot year.",
      "Primary datasets are published, so the headline claims can be checked directly.",
    ],
    nextStep: "Open one of the linked datasets and read what it actually measures.",
    estimatedMinutes: 12,
    source: { url: "https://climate.nasa.gov/evidence/", publisher: "NASA" },
  },
];

/** Keyword rules mapping trend terms to taxonomy category/topic. */
export const CLASSIFY_RULES: ClassifyRule[] = [
  { category: "technology-and-ai", topic: "working-with-ai-tools", keywords: ["ai", "llm", "chatbot", "prompt", "agent"] },
  { category: "technology-and-ai", topic: "security-basics", keywords: ["phishing", "scam email", "passkey", "2fa", "malware"] },
  { category: "personal-finance", topic: "budgeting", keywords: ["budget", "cost of living", "saving money"] },
  { category: "personal-finance", topic: "avoiding-scams", keywords: ["scam", "fraud", "fake bank"] },
  { category: "health-and-wellbeing", topic: "sleep", keywords: ["sleep", "insomnia", "rest"] },
  { category: "learning-how-to-learn", topic: "spaced-repetition", keywords: ["spaced repetition", "flashcard", "memory"] },
];

/** Build a deterministic fixture adapter from a fixed observation list. */
export function fixtureAdapter(
  id: string,
  sourceClass: TrendSourceAdapter["sourceClass"],
  observations: TrendObservation[],
): TrendSourceAdapter {
  return { id, sourceClass, fetch: async () => observations };
}

/**
 * Illustrative trend observations (NOT live data). Designed to exercise:
 * - a well-supported multi-source trend (passkeys),
 * - a single-source trend (insufficient / not verified),
 * - a stale trend (expired),
 * - an unclassified trend.
 * `now` for the demo is 2026-11-18T00:00:00Z.
 */
export const DEMO_OBSERVATIONS_A: TrendObservation[] = [
  { id: "a1", term: "passkeys", sourceId: "fixture-official", observedAt: "2026-11-16T00:00:00Z", signal: 3 },
  { id: "a2", term: "passkeys", sourceId: "fixture-official", observedAt: "2026-11-17T00:00:00Z", signal: 4 },
  { id: "a3", term: "AI study tools", sourceId: "fixture-official", observedAt: "2026-11-10T00:00:00Z", signal: 2 },
  { id: "a4", term: "quantum widgets", sourceId: "fixture-official", observedAt: "2026-10-01T00:00:00Z", signal: 5 },
];

export const DEMO_OBSERVATIONS_B: TrendObservation[] = [
  { id: "b1", term: "passkeys", sourceId: "fixture-institution", observedAt: "2026-11-15T00:00:00Z", signal: 2 },
  { id: "b2", term: "passkey", sourceId: "fixture-institution", observedAt: "2026-11-17T00:00:00Z", signal: 3 },
  { id: "b3", term: "AI study tools", sourceId: "fixture-institution", observedAt: "2026-11-12T00:00:00Z", signal: 1 },
];

export const DEMO_NOW = "2026-11-18T00:00:00Z";
