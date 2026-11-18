import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createHttpFetcher, DEFAULT_USER_AGENT, researchDraft, retrieveSource } from "@/factory/live";
import type { DraftInput } from "@/factory";

/**
 * Real evidence retrieval for the first ten VSHARES Originals.
 *
 * Gated behind FACTORY_LIVE=1 (offline in CI). Retrieves each card's source
 * (robots-aware, rate-limited) and verifies the card's claims against the
 * retrieved passages. Records provenance and every retrieval limitation
 * honestly; never fabricates a quote, citation or verification. Output:
 * docs/samples/originals-evidence.json. Nothing is published.
 */
const LIVE = process.env.FACTORY_LIVE === "1";
const NOW = new Date().toISOString();
const DIR = resolve(process.cwd(), "docs/samples");

// 6 reused seed cards + 4 new cards that host the candidate videos. Claims are
// faithful to the source; verification is against the retrieved page.
const ORIGINALS: DraftInput[] = [
  {
    slug: "a-first-monthly-budget", category: "personal-finance", topic: "budgeting", level: "beginner",
    format: "tool", objective: "Build a first monthly budget from real numbers.",
    title: "A budget planner that does the arithmetic for you",
    summary: "A free UK government-backed budgeting tool: list income and fixed costs, then see what is left. General information, not advice.",
    takeaways: ["Writing fixed costs down is what makes them negotiable.", "A budget is a plan for money you have, not money you might get."],
    nextStep: "List every fixed monthly cost you have this week.", estimatedMinutes: 20,
    source: { url: "https://www.moneyhelper.org.uk/en/everyday-money/budgeting/budget-planner", publisher: "MoneyHelper" },
  },
  {
    slug: "secure-your-main-accounts", category: "technology-and-ai", topic: "security-basics", level: "beginner",
    format: "article", objective: "Take the few steps that stop most ordinary attacks.",
    title: "The security steps the NCSC says matter most",
    summary: "The UK National Cyber Security Centre's short guidance: a few steps prevent the majority of ordinary attacks on everyday accounts.",
    takeaways: ["Use a strong and separate password for your email.", "Turn on two-factor authentication to protect important accounts."],
    nextStep: "Turn on two-factor authentication for your main email today.", estimatedMinutes: 10,
    source: { url: "https://www.ncsc.gov.uk/collection/top-tips-for-staying-secure-online", publisher: "National Cyber Security Centre" },
  },
  {
    slug: "getting-to-sleep", category: "health-and-wellbeing", topic: "sleep", level: "beginner",
    format: "article", objective: "Apply evidence-led basics that help with sleep.",
    title: "What the NHS says actually helps you sleep",
    summary: "NHS guidance on sleep: regular timing and winding down help; persistent problems are worth seeing a doctor about. Not medical advice.",
    takeaways: ["A consistent wake time does more for sleep than a fixed bedtime.", "Persistent sleep problems are worth raising with a doctor."],
    nextStep: "Set the same wake-time alarm every day this week.", estimatedMinutes: 7,
    source: { url: "https://www.nhs.uk/live-well/sleep-and-tiredness/how-to-get-to-sleep/", publisher: "NHS" },
  },
  {
    slug: "what-a-neural-network-is", category: "technology-and-ai", topic: "ai-foundations", level: "beginner",
    format: "course", objective: "Understand how a machine-learning model is trained and evaluated.",
    title: "A structured first course in machine learning",
    summary: "A free, self-paced course introducing how models are trained and evaluated, aimed at people who build software or work alongside those who do.",
    takeaways: ["Training a model means adjusting it until its predictions match known answers.", "Most of the work in practice is preparing data, not choosing an algorithm."],
    nextStep: "Work through the first module and note one new term.", estimatedMinutes: 25,
    source: { url: "https://developers.google.com/machine-learning/crash-course", publisher: "Google" },
  },
  {
    slug: "preparing-for-an-interview", category: "career-development", topic: "interviews", level: "beginner",
    format: "article", objective: "Prepare structured interview answers from real experience.",
    title: "Preparing for an interview without guessing",
    summary: "Free UK careers guidance on interview preparation: research, structured answers about your experience, and good questions to ask.",
    takeaways: ["A structured answer about a real situation beats a general claim about yourself.", "The questions you ask are part of what is assessed."],
    nextStep: "Write one example using situation, task, action and result.", estimatedMinutes: 12,
    source: { url: "https://nationalcareers.service.gov.uk/careers-advice/interview-advice", publisher: "National Careers Service" },
  },
  {
    slug: "writing-people-understand", category: "communication", topic: "clear-writing", level: "beginner",
    format: "article", objective: "Write so people understand the first time.",
    title: "Writing that people understand the first time",
    summary: "The style guidance behind GOV.UK, written for people producing information the public must act on: plain words, short sentences, clear structure.",
    takeaways: ["Write for the person with the least time and the most to lose.", "Shorter sentences are not simpler ideas, only clearer ones."],
    nextStep: "Rewrite one paragraph you sent this week, cutting it by a third.", estimatedMinutes: 12,
    source: { url: "https://www.gov.uk/guidance/content-design/writing-for-gov-uk", publisher: "Government Digital Service" },
  },
  // --- new cards that host the candidate videos ---
  {
    slug: "the-essence-of-calculus", category: "learning-how-to-learn", topic: "deliberate-practice", level: "beginner",
    format: "article", objective: "Build intuition for what calculus is about before the mechanics.",
    title: "Understanding calculus before the rules",
    summary: "An introduction to calculus that builds intuition for rates of change and areas, so the formal rules make sense rather than being memorised.",
    takeaways: ["Calculus is about how things change and how those changes accumulate.", "Intuition for the idea makes the formal rules easier to learn."],
    nextStep: "Watch the first chapter and restate the main idea in your own words.", estimatedMinutes: 20,
    source: { url: "https://www.khanacademy.org/math/calculus-1", publisher: "Khan Academy" },
  },
  {
    slug: "reading-the-evidence-on-black-holes", category: "science-and-nature", topic: "space-basics", level: "beginner",
    format: "article", objective: "Understand what a black hole is from a primary source.",
    title: "What black holes are, from the people who study them",
    summary: "NASA's plain explanation of black holes: what they are, how they form, and what we can and cannot observe. Links to the underlying science.",
    takeaways: ["A black hole is a region where gravity is so strong that nothing, not even light, escapes.", "Much about black holes is still an open research question."],
    nextStep: "Read NASA's overview and write down one question it leaves open.", estimatedMinutes: 12,
    source: { url: "https://science.nasa.gov/universe/black-holes/", publisher: "NASA" },
  },
  {
    slug: "perseverance-and-the-limits-of-grit", category: "personal-development-and-mindset", topic: "goal-setting", level: "beginner",
    format: "article", objective: "Understand 'grit' and, honestly, the evidence behind it.",
    title: "Perseverance, and the honest evidence on 'grit'",
    summary: "An overview of grit — sustained passion and perseverance — and the academic debate: it is real but overlaps heavily with conscientiousness and predicts success only modestly.",
    takeaways: ["Grit is real but overlaps heavily with conscientiousness.", "Its independent effect on success is small, so treat strong claims with care."],
    nextStep: "Pick one goal and plan the next concrete step, not just the resolve.", estimatedMinutes: 10,
    source: { url: "https://en.wikipedia.org/wiki/Grit_(personality_trait)", publisher: "Wikipedia" },
  },
  {
    slug: "starting-to-program-with-python", category: "technology-and-ai", topic: "software-and-building", level: "beginner",
    format: "course", objective: "Follow a complete beginner's introduction to programming with Python.",
    title: "Starting to program with Python",
    summary: "The official Python tutorial: a structured, free introduction to programming with Python, from basics to writing small useful programs.",
    takeaways: ["Python is designed to be readable, which helps beginners learn.", "You learn to program by writing small programs, not only by reading."],
    nextStep: "Install Python and run the first example from the tutorial.", estimatedMinutes: 30,
    source: { url: "https://docs.python.org/3/tutorial/index.html", publisher: "Python Software Foundation" },
  },
];

const delay = (ms: number): Promise<void> => new Promise<void>((r) => setTimeout(() => r(), ms));

describe("Originals evidence (real retrieval)", () => {
  it.skipIf(!LIVE)(
    "retrieves each source and verifies claims, recording provenance and limitations",
    async () => {
      const fetcher = createHttpFetcher(DEFAULT_USER_AGENT);
      const cards = [];
      for (const draft of ORIGINALS) {
        const retrieval = await retrieveSource(draft.source.url, {
          fetcher, ua: DEFAULT_USER_AGENT, now: NOW, beforeRequest: () => delay(1500),
        });
        const researched = researchDraft(draft, retrieval, { now: NOW });
        cards.push({
          slug: researched.slug,
          source: { publisher: draft.source.publisher, url: draft.source.url },
          retrieval: researched.retrieval,
          counts: researched.counts,
          evidenceOverall: researched.evidenceOverall,
          verifications: researched.verifications.map((v) => ({ claim: v.claim, verdict: v.verdict, overlap: v.overlap, passage: v.passage?.slice(0, 180) })),
        });
      }
      mkdirSync(DIR, { recursive: true });
      writeFileSync(resolve(DIR, "originals-evidence.json"), JSON.stringify({
        generatedAt: NOW,
        note: "Real retrieval. A claim is 'verified' only when a retrieved passage supports it; 'unavailable' means the source could not be read (robots-disallowed, JS-rendered or throttled). No quote or citation is fabricated.",
        cards,
      }, null, 2) + "\n");
      for (const c of cards) expect(c.retrieval.status).toBeDefined();
    },
    180000,
  );

  it("the ten Originals are well-formed draft inputs", () => {
    expect(ORIGINALS).toHaveLength(10);
    for (const d of ORIGINALS) {
      expect(d.title.length).toBeGreaterThanOrEqual(10);
      expect(d.summary.length).toBeGreaterThanOrEqual(40);
      expect(d.takeaways.length).toBeGreaterThanOrEqual(1);
      expect(d.source.url).toMatch(/^https:\/\//);
    }
  });
});
