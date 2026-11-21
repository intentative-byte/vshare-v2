/**
 * Originals — batch 2 candidate generation (Phase 10.13 T3).
 *
 * HONESTY CONTRACT (read before changing):
 * - These are DRAFT CANDIDATES prepared for human editorial review. Nothing here
 *   is fact-checked, approved, verified or ready for publication.
 * - Provenance (source URL + publisher) is PROPOSED from well-known, reputable
 *   publishers; it has NOT been retrieved or verified in this run. No supporting
 *   quotes are supplied, so the factory's evidence verdict is deliberately NOT
 *   "verified" for any candidate — every one is left explicitly UNVERIFIED and
 *   must be grounded by a human (or a live `FACTORY_LIVE=1` retrieval) later.
 * - Summaries describe the *kind* of resource; they never assert a fact as
 *   checked. The rubric (which penalises unsupported claims) will mark most as
 *   "revise" until evidence is attached — that is the correct, honest signal.
 * - This module is pure and local-first: no network, no database, no publishing.
 */

import { runPipeline } from "../pipeline";
import { classifyDuplicate, type CatalogueEntry, type DuplicateAssessment } from "../dedup";
import type { DraftInput, FactoryCard } from "../types";

/**
 * The existing catalogue to dedup against: the ten seeded batch-1 cards
 * (`supabase/seed/020_cards_batch_1.sql`). URLs and titles are copied from the
 * seed so an exact-URL collision or a near-duplicate title is caught.
 */
export const EXISTING_CATALOGUE: CatalogueEntry[] = [
  { url: "https://www.moneyhelper.org.uk/en/everyday-money/budgeting/budget-planner", title: "A budget planner that does the arithmetic for you" },
  { url: "https://developers.google.com/machine-learning/crash-course", title: "A structured first course in machine learning" },
  { url: "https://ico.org.uk/for-the-public/your-right-to-get-copies-of-your-data/", title: "Ask any organisation for a copy of your personal data" },
  { url: "https://nationalcareers.service.gov.uk/careers-advice/interview-advice", title: "Preparing for an interview without guessing" },
  { url: "https://www.gov.uk/guidance/content-design/writing-for-gov-uk", title: "Writing so anyone can understand you" },
  { url: "https://www.gov.uk/set-up-business", title: "The actual steps to set up a business in the UK" },
  { url: "https://www.ncsc.gov.uk/collection/top-tips-for-staying-secure-online", title: "Staying secure online, from the national authority" },
  { url: "https://www.nhs.uk/live-well/sleep-and-tiredness/how-to-get-to-sleep/", title: "What actually helps when you cannot sleep" },
  { url: "https://www.takefive-stopfraud.org.uk/", title: "Take Five to Stop Fraud" },
  { url: "https://augmentingcognition.com/ltm.html", title: "How spaced repetition strengthens memory" },
];

/**
 * Twenty candidate drafts across the launch taxonomy. New sources only (no seed
 * URL reused). No supporting quotes ⇒ evidence stays unverified by design.
 */
export const BATCH2_CANDIDATES: DraftInput[] = [
  {
    slug: "prompting-patterns-for-everyday-work",
    category: "technology-and-ai",
    topic: "working-with-ai-tools",
    level: "beginner",
    format: "article",
    objective: "Write clearer prompts that get useful answers from a chat assistant.",
    title: "Giving an AI assistant the context it needs",
    summary:
      "A practical guide to writing prompts that include the goal, the audience and the format you want, with examples of how adding context changes the answer. General guidance, not advice about any specific tool's internals.",
    takeaways: ["State the goal, the audience and the format you want.", "Give an example of a good answer when you can."],
    nextStep: "Rewrite one prompt you used today to add the goal and the format you wanted.",
    estimatedMinutes: 8,
    source: { url: "https://platform.openai.com/docs/guides/prompt-engineering", publisher: "OpenAI" },
  },
  {
    slug: "how-large-language-models-predict-text",
    category: "technology-and-ai",
    topic: "ai-foundations",
    level: "beginner",
    format: "article",
    objective: "Understand, at a high level, how a language model generates text.",
    title: "What a language model is actually doing",
    summary:
      "An accessible explainer of how language models predict the next token from patterns in training data, why they can be confidently wrong, and what that means for how you use them. Conceptual, not mathematical.",
    takeaways: ["A language model predicts likely text; it does not look facts up.", "Confidence is not the same as correctness."],
    nextStep: "Next time an assistant states a fact, check it against a primary source before relying on it.",
    estimatedMinutes: 10,
    source: { url: "https://developers.google.com/machine-learning/resources/intro-llms", publisher: "Google for Developers" },
  },
  {
    slug: "version-control-with-git-basics",
    category: "technology-and-ai",
    topic: "software-and-building",
    level: "beginner",
    format: "article",
    objective: "Use Git to track changes and recover earlier versions of your work.",
    title: "Tracking your work with version control",
    summary:
      "An introduction to the core Git ideas — commits, branches and history — aimed at people new to version control, with the everyday commands that cover most work. Reference material from the official documentation.",
    takeaways: ["A commit is a save point you can return to.", "Branches let you try a change without risking the main line."],
    nextStep: "Initialise a repository for a small project and make your first commit today.",
    estimatedMinutes: 15,
    source: { url: "https://git-scm.com/book/en/v2/Getting-Started-About-Version-Control", publisher: "Pro Git (git-scm.com)" },
  },
  {
    slug: "understanding-cookies-and-tracking",
    category: "technology-and-ai",
    topic: "data-and-privacy",
    level: "beginner",
    format: "article",
    objective: "Recognise how websites track you and adjust your browser settings.",
    title: "Who is watching when you browse",
    summary:
      "An explainer of cookies, trackers and fingerprinting and what each can and cannot see, with the browser settings that reduce tracking. General privacy guidance for everyday users.",
    takeaways: ["Third-party cookies follow you across sites, not just the one you visit.", "Blocking trackers mostly trades a little convenience for more privacy."],
    nextStep: "Open your browser's privacy settings and turn on tracking protection.",
    estimatedMinutes: 9,
    source: { url: "https://www.mozilla.org/en-US/firefox/features/tracking-protection/", publisher: "Mozilla" },
  },
  {
    slug: "choosing-strong-passphrases",
    category: "technology-and-ai",
    topic: "security-basics",
    level: "beginner",
    format: "article",
    objective: "Create and manage passwords that are hard to guess and easy to keep.",
    title: "Passwords that survive a real attack",
    summary:
      "Guidance on using long passphrases of three random words, a password manager and two-factor authentication, from the national cyber-security authority. General security advice for everyone.",
    takeaways: ["Three random words make a password long and memorable.", "A password manager means you only remember one."],
    nextStep: "Turn on two-factor authentication for your email account today.",
    estimatedMinutes: 8,
    source: { url: "https://www.ncsc.gov.uk/collection/top-tips-for-staying-secure-online/use-a-strong-and-separate-password-for-email", publisher: "NCSC" },
  },
  {
    slug: "writing-a-cv-that-gets-read",
    category: "career-development",
    topic: "job-search",
    level: "beginner",
    format: "article",
    objective: "Write a CV that clearly shows your relevant experience.",
    title: "A CV that answers the employer's question",
    summary:
      "Practical guidance on structuring a CV around what the employer is hiring for, leading with results, and keeping it to the point, from the national careers service. General guidance, not individual advice.",
    takeaways: ["Lead each role with what you achieved, not only what you did.", "Match the CV to the job you are applying for."],
    nextStep: "Rewrite the top of your CV to lead with one concrete result.",
    estimatedMinutes: 12,
    source: { url: "https://nationalcareers.service.gov.uk/careers-advice/cv-sections", publisher: "National Careers Service" },
  },
  {
    slug: "salary-negotiation-first-principles",
    category: "career-development",
    topic: "negotiation",
    level: "intermediate",
    format: "article",
    objective: "Prepare for a salary conversation with research and a clear range.",
    title: "Going into a pay conversation prepared",
    summary:
      "An overview of how to research a market rate, anchor with a range and respond to a first offer, framed as general preparation rather than advice about any specific employer or contract.",
    takeaways: ["Decide your range before the conversation, not during it.", "A number backed by market research is easier to hold."],
    nextStep: "Look up the typical pay range for your role before your next review.",
    estimatedMinutes: 11,
    source: { url: "https://www.themuse.com/advice/how-to-negotiate-salary", publisher: "The Muse" },
  },
  {
    slug: "answering-behavioural-interview-questions",
    category: "career-development",
    topic: "interviews",
    level: "beginner",
    format: "article",
    objective: "Structure interview answers so they are concrete and easy to follow.",
    title: "Telling a clear story in an interview",
    summary:
      "A guide to the situation-task-action-result structure for answering 'tell me about a time' questions, with worked examples. General interview preparation.",
    takeaways: ["Name the result so the story has a point.", "One concrete example beats three vague claims."],
    nextStep: "Write one past example in situation-task-action-result form before your next interview.",
    estimatedMinutes: 10,
    source: { url: "https://www.indeed.com/career-advice/interviewing/how-to-use-the-star-interview-response-technique", publisher: "Indeed Career Guide" },
  },
  {
    slug: "talking-to-customers-before-you-build",
    category: "entrepreneurship",
    topic: "talking-to-customers",
    level: "beginner",
    format: "book",
    objective: "Run customer conversations that produce honest, useful signal.",
    title: "Asking customers questions that are hard to fake",
    summary:
      "A well-known short book on how to talk to potential customers about their lives rather than your idea, so the feedback you get is real. General methodology for early founders.",
    takeaways: ["Ask about what people already do, not whether they like your idea.", "Compliments are not commitments."],
    nextStep: "Have one conversation this week about a problem, without pitching your solution.",
    estimatedMinutes: 25,
    source: { url: "http://momtestbook.com/", publisher: "The Mom Test (Rob Fitzpatrick)" },
  },
  {
    slug: "finding-a-problem-worth-solving",
    category: "entrepreneurship",
    topic: "finding-an-idea",
    level: "beginner",
    format: "article",
    objective: "Evaluate a business idea against a real, felt problem.",
    title: "Starting from a problem, not an idea",
    summary:
      "An essay on why durable startups tend to start from a problem the founders understand well, with questions to pressure-test an idea. General perspective, not investment advice.",
    takeaways: ["A problem you have felt is easier to judge than one you imagine.", "Few people wanting something a lot beats many wanting it a little."],
    nextStep: "Write down one problem you have personally hit three times this month.",
    estimatedMinutes: 14,
    source: { url: "https://www.paulgraham.com/startupideas.html", publisher: "Paul Graham" },
  },
  {
    slug: "pricing-your-first-product",
    category: "entrepreneurship",
    topic: "pricing-and-revenue",
    level: "intermediate",
    format: "article",
    objective: "Choose a first price based on value and costs, not guesswork.",
    title: "Setting a first price you can defend",
    summary:
      "An overview of value-based versus cost-plus pricing and common first-price mistakes, aimed at founders setting a price for the first time. General guidance, not financial advice.",
    takeaways: ["Price on the value to the customer, then check it covers costs.", "Too cheap signals low value as often as it wins sales."],
    nextStep: "Write down what your product saves or earns a customer before you set a price.",
    estimatedMinutes: 12,
    source: { url: "https://www.priceintelligently.com/blog/bid/163986/the-anatomy-of-saas-pricing-strategy", publisher: "ProfitWell / Price Intelligently" },
  },
  {
    slug: "clearing-debt-with-a-repayment-order",
    category: "personal-finance",
    topic: "debt-and-credit",
    level: "beginner",
    format: "article",
    objective: "Understand common strategies for paying down multiple debts.",
    title: "A plan for paying down more than one debt",
    summary:
      "An explainer of the avalanche and snowball approaches to repaying several debts, and where to get free, impartial debt help in the UK. General information, not debt advice about your situation.",
    takeaways: ["Paying the highest-interest debt first costs the least overall.", "Free, impartial debt advice exists and is worth using."],
    nextStep: "List your debts with their interest rates before choosing an order.",
    estimatedMinutes: 12,
    source: { url: "https://www.moneyhelper.org.uk/en/money-troubles/dealing-with-debt/how-to-prioritise-your-debts", publisher: "MoneyHelper" },
  },
  {
    slug: "what-a-stocks-and-shares-isa-is",
    category: "personal-finance",
    topic: "saving-and-investing-basics",
    level: "beginner",
    format: "article",
    objective: "Understand what an ISA is and how the tax wrapper works.",
    title: "The tax-free wrapper, explained plainly",
    summary:
      "A plain explanation of how ISAs work in the UK, the annual allowance and the difference between cash and stocks-and-shares ISAs. General information, not a recommendation to buy any product.",
    takeaways: ["An ISA is a wrapper around savings or investments, not a product itself.", "The allowance resets each tax year and does not roll over."],
    nextStep: "Check this year's ISA allowance before deciding anything.",
    estimatedMinutes: 10,
    source: { url: "https://www.gov.uk/individual-savings-accounts", publisher: "GOV.UK" },
  },
  {
    slug: "spotting-investment-scams",
    category: "personal-finance",
    topic: "avoiding-scams",
    level: "beginner",
    format: "article",
    objective: "Recognise the warning signs of an investment scam.",
    title: "When an investment is too good to be true",
    summary:
      "Guidance from the UK financial regulator on the common signs of investment scams — guaranteed returns, time pressure, unregistered firms — and how to check a firm. General consumer protection information.",
    takeaways: ["Guaranteed high returns with no risk is the clearest red flag.", "Check the firm on the regulator's register before you pay."],
    nextStep: "Before any investment, look the firm up on the FCA register.",
    estimatedMinutes: 9,
    source: { url: "https://www.fca.org.uk/scamsmart", publisher: "Financial Conduct Authority" },
  },
  {
    slug: "deep-work-and-protecting-attention",
    category: "productivity",
    topic: "attention-and-focus",
    level: "beginner",
    format: "article",
    objective: "Protect blocks of focused time from constant interruption.",
    title: "Making room for focused work",
    summary:
      "An overview of why switching tasks is costly and practical ways to protect focus — time-blocking, notifications off, a single task at a time. General productivity guidance.",
    takeaways: ["Every switch has a hidden restart cost.", "Protecting one focused block beats many fragmented ones."],
    nextStep: "Block one 45-minute, notification-free focus slot tomorrow.",
    estimatedMinutes: 9,
    source: { url: "https://www.apa.org/topics/research/multitasking", publisher: "American Psychological Association" },
  },
  {
    slug: "weekly-planning-that-sticks",
    category: "productivity",
    topic: "planning-and-prioritising",
    level: "beginner",
    format: "article",
    objective: "Plan a week around a few outcomes rather than a long task list.",
    title: "Planning a week you can actually finish",
    summary:
      "A guide to choosing a small number of weekly outcomes and scheduling them first, before the list grows. General guidance on prioritisation.",
    takeaways: ["Pick the three outcomes that matter before filling the calendar.", "A plan with everything in it is not a plan."],
    nextStep: "Choose three outcomes for next week before Monday.",
    estimatedMinutes: 8,
    source: { url: "https://hbr.org/2020/01/to-achieve-big-goals-start-with-small-habits", publisher: "Harvard Business Review" },
  },
  {
    slug: "building-a-habit-that-lasts",
    category: "productivity",
    topic: "habits",
    level: "beginner",
    format: "article",
    objective: "Design a small habit that survives busy days.",
    title: "Starting a habit small enough to keep",
    summary:
      "An overview of making a new habit tiny, attaching it to an existing routine and tracking it, so it survives low-motivation days. General behaviour-change guidance.",
    takeaways: ["A habit small enough to never skip compounds over time.", "Anchor a new habit to something you already do."],
    nextStep: "Pick a habit so small it takes under two minutes, and do it after an existing routine tomorrow.",
    estimatedMinutes: 8,
    source: { url: "https://jamesclear.com/atomic-habits", publisher: "James Clear" },
  },
  {
    slug: "writing-a-clear-first-draft",
    category: "communication",
    topic: "clear-writing",
    level: "beginner",
    format: "book",
    objective: "Cut clutter so your writing says what you mean.",
    title: "Saying more by writing less",
    summary:
      "A classic short reference on plain, clear writing — cutting needless words and preferring the concrete. General writing guidance.",
    takeaways: ["Most first drafts get stronger when you cut a fifth of the words.", "Concrete words beat abstract ones."],
    nextStep: "Take one paragraph you wrote today and cut it by a quarter.",
    estimatedMinutes: 20,
    source: { url: "https://www.gutenberg.org/ebooks/37134", publisher: "The Elements of Style (public domain)" },
  },
  {
    slug: "structuring-a-short-talk",
    category: "communication",
    topic: "speaking-and-presenting",
    level: "beginner",
    format: "article",
    objective: "Structure a short talk around one idea the audience remembers.",
    title: "Giving a talk that lands one idea",
    summary:
      "Guidance on building a short talk around a single message, with an opening that earns attention and an ending that repeats the point. General presentation guidance.",
    takeaways: ["One idea the audience keeps beats five they forget.", "Tell them the point, then show why it is true."],
    nextStep: "Write the one sentence you want your audience to remember before you make any slides.",
    estimatedMinutes: 10,
    source: { url: "https://www.ted.com/participate/organize-a-local-tedx-event/tedx-organizer-guide/speakers-program/prepare-your-speaker", publisher: "TED" },
  },
  {
    slug: "reviewing-your-credit-report",
    category: "personal-finance",
    topic: "debt-and-credit",
    level: "beginner",
    format: "article",
    objective: "Check your credit report and understand what affects it.",
    title: "Reading your own credit report",
    summary:
      "An explanation of what a credit report contains, how to get it for free in the UK and what affects a credit score. General information, not advice about borrowing.",
    takeaways: ["You can check your credit report for free.", "Errors on a report can be challenged and fixed."],
    nextStep: "Request one of your statutory credit reports this week and read it.",
    estimatedMinutes: 10,
    source: { url: "https://www.moneyhelper.org.uk/en/everyday-money/credit-and-purchases/how-to-check-your-credit-report", publisher: "MoneyHelper" },
  },
];

export interface Batch2CandidateReport {
  slug: string;
  category: string;
  topic: string;
  objective: string;
  provenance: { url: string; publisher: string };
  /** Factory evidence verdict. Never "verified" here — no quotes were supplied. */
  evidenceStatus: FactoryCard["evidence"]["overall"];
  qualityComposite: number;
  qualityVerdict: FactoryCard["quality"]["verdict"];
  isHighImpact: boolean;
  requiresFactCheck: boolean;
  duplicate: DuplicateAssessment;
  /** A pure readiness hint: not a duplicate and not a rubric reject. Not approval. */
  bridgeReady: boolean;
}

export interface Batch2Report {
  total: number;
  candidates: Batch2CandidateReport[];
  summary: {
    verified: number;
    byEvidenceStatus: Record<string, number>;
    byQualityVerdict: Record<string, number>;
    byDuplicateVerdict: Record<string, number>;
    exactDuplicates: number;
    nearDuplicatesForReview: number;
    bridgeReady: number;
  };
}

/** Run the factory + dedup over the batch-2 candidates. Pure and deterministic. */
export function prepareBatch2(
  candidates: DraftInput[] = BATCH2_CANDIDATES,
  catalogue: CatalogueEntry[] = EXISTING_CATALOGUE,
): Batch2Report {
  const byEvidenceStatus: Record<string, number> = {};
  const byQualityVerdict: Record<string, number> = {};
  const byDuplicateVerdict: Record<string, number> = {};

  const reports: Batch2CandidateReport[] = candidates.map((candidate) => {
    const [card] = runPipeline([candidate]).cards;
    if (!card) {
      throw new Error(`prepareBatch2: the pipeline produced no card for "${candidate.slug}"`);
    }
    const duplicate = classifyDuplicate({ url: candidate.source.url, title: candidate.title }, catalogue);

    byEvidenceStatus[card.evidence.overall] = (byEvidenceStatus[card.evidence.overall] ?? 0) + 1;
    byQualityVerdict[card.quality.verdict] = (byQualityVerdict[card.quality.verdict] ?? 0) + 1;
    byDuplicateVerdict[duplicate.verdict] = (byDuplicateVerdict[duplicate.verdict] ?? 0) + 1;

    return {
      slug: card.slug,
      category: card.category,
      topic: card.topic,
      objective: card.objective,
      provenance: { url: card.source.url, publisher: card.source.publisher },
      evidenceStatus: card.evidence.overall,
      qualityComposite: card.quality.composite,
      qualityVerdict: card.quality.verdict,
      isHighImpact: card.safety.isHighImpact,
      requiresFactCheck: card.requiresFactCheck,
      duplicate,
      bridgeReady: card.quality.verdict !== "reject" && duplicate.verdict !== "exact_duplicate",
    };
  });

  return {
    total: reports.length,
    candidates: reports,
    summary: {
      verified: byEvidenceStatus["verified"] ?? 0,
      byEvidenceStatus,
      byQualityVerdict,
      byDuplicateVerdict,
      exactDuplicates: byDuplicateVerdict["exact_duplicate"] ?? 0,
      nearDuplicatesForReview: byDuplicateVerdict["near_duplicate_review"] ?? 0,
      bridgeReady: reports.filter((r) => r.bridgeReady).length,
    },
  };
}
