/**
 * Editorial review data for the first ten VSHARES Originals.
 *
 * Static, committed data derived from the human review pack
 * (docs/VSHARES_ORIGINALS_REVIEW_PACK.md) and the real evidence run
 * (docs/samples/originals-evidence.json). It is NOT a parallel publication
 * system: it drives a reviewer-only inspection surface. No decision here writes
 * to the database; the content states below are the real catalogue states
 * (all draft today). Pure helpers so they can be unit-tested.
 */

/** The agent's readiness assessment — NOT an approval. */
export type EditorialStatus = "READY FOR HUMAN REVIEW" | "REVISION REQUIRED" | "EVIDENCE BLOCKED";

/** The real content lifecycle state in the catalogue. */
export type ContentState = "draft" | "reviewed" | "approved" | "published";

export type DirectSupport = "yes" | "indirect" | "no" | "n/a";
export type Confidence = "high" | "medium" | "low" | "n/a";

export interface ClaimEvidence {
  claim: string;
  source: string;
  authority: string;
  method: string;
  directSupport: DirectSupport;
  contradictory?: string;
  verificationDate: string;
  confidence: Confidence;
  concerns?: string;
}

export interface MediaCandidate {
  title: string;
  creator: string;
  videoId: string;
  /** oEmbed confirmed existence/attribution — NOT a content fact-check. */
  embedStatus: "verified-metadata" | "unknown";
  factualReview: string;
}

export interface EditorialCard {
  id: string;
  title: string;
  category: string;
  level: string;
  highImpact: boolean;
  status: EditorialStatus;
  contentState: ContentState;
  hook: string;
  objective: string;
  explanation: string;
  sourceUrl: string;
  sourceLimitation?: string;
  claims: ClaimEvidence[];
  outstandingConcerns: string[];
  publicationBlockers: string[];
  media?: MediaCandidate;
}

const D = "2026-11-18";

export const ORIGINALS_EDITORIAL: EditorialCard[] = [
  {
    id: "a-first-monthly-budget", title: "A first monthly budget", category: "Personal Finance", level: "beginner",
    highImpact: true, status: "REVISION REQUIRED", contentState: "draft",
    hook: "You can't manage what you haven't written down.",
    objective: "Build a first monthly budget from real numbers.",
    explanation: "A free, government-backed budgeting tool lists income and fixed costs so you can see what's left — general information, not financial advice.",
    sourceUrl: "https://www.moneyhelper.org.uk/en/everyday-money/budgeting/budget-planner",
    sourceLimitation: "robots.txt disallows crawling — not auto-verified; a crawlable alternative is GOV.UK debt advice.",
    claims: [
      { claim: "Writing costs down helps you manage them", source: "MoneyHelper", authority: "UK government-backed money guidance", method: "source robots-disallowed; practical advice, not an empirical finding", directSupport: "no", verificationDate: D, confidence: "low", concerns: "reworded from a factual assertion to advice; verify source manually" },
      { claim: "A budget plans money you have, not money you might get", source: "—", authority: "definitional framing", method: "definition", directSupport: "n/a", verificationDate: D, confidence: "n/a" },
    ],
    outstandingConcerns: ["MoneyHelper page is robots-blocked", "high-impact: needs an independent second reviewer"],
    publicationBlockers: ["no published parent card yet", "source verification pending", "second review required"],
  },
  {
    id: "secure-your-main-accounts", title: "Secure your main accounts", category: "Technology / Cybersecurity", level: "beginner",
    highImpact: false, status: "READY FOR HUMAN REVIEW", contentState: "draft",
    hook: "Protect the one account that can reset all the others.",
    objective: "Take the few steps that stop most ordinary attacks.",
    explanation: "The NCSC's short guidance: a few steps prevent the majority of ordinary attacks on everyday accounts.",
    sourceUrl: "https://www.ncsc.gov.uk/collection/top-tips-for-staying-secure-online",
    claims: [
      { claim: "Use a strong and separate password for your email", source: "NCSC", authority: "UK national cyber security authority", method: "NCSC's own top tips (retrieved live, 11 passages)", directSupport: "yes", verificationDate: D, confidence: "high" },
      { claim: "Turn on two-factor authentication for important accounts", source: "NCSC", authority: "NCSC", method: "authoritative recommendation", directSupport: "yes", verificationDate: D, confidence: "high" },
    ],
    outstandingConcerns: ["confirm wording matches NCSC"],
    publicationBlockers: ["no published parent card yet"],
  },
  {
    id: "getting-to-sleep", title: "Getting to sleep", category: "Health & Wellbeing", level: "beginner",
    highImpact: true, status: "REVISION REQUIRED", contentState: "draft",
    hook: "Regular sleep timing does more than chasing hours.",
    objective: "Apply evidence-led sleep basics.",
    explanation: "Keep a regular sleep schedule; a consistent wake time is a good anchor for your body clock. Persistent problems are worth seeing a doctor about. General information, not medical advice.",
    sourceUrl: "https://www.nhs.uk/live-well/sleep-and-tiredness/how-to-get-to-sleep/",
    sourceLimitation: "NHS page is JS-rendered (no extractable text) — verify wording manually.",
    claims: [
      { claim: "A consistent wake time does more than a fixed bedtime", source: "popular articles", authority: "practitioner blogs", method: "web research", directSupport: "no", contradictory: "No head-to-head study; some evidence favours bedtime (Finnish cohort).", verificationDate: D, confidence: "low", concerns: "OVERSTATED — corrected/removed" },
      { claim: "A regular sleep schedule is linked to better health", source: "UK Biobank regularity study (~60k); 2025 systematic review", authority: "academic literature", method: "independent research", directSupport: "yes", contradictory: "association, not proven causation", verificationDate: D, confidence: "medium" },
      { claim: "Persistent sleep problems are worth raising with a doctor", source: "NHS", authority: "UK national health service", method: "standard NHS guidance", directSupport: "yes", verificationDate: D, confidence: "high" },
    ],
    outstandingConcerns: ["overstated wake-vs-bedtime claim corrected", "NHS source JS-blocked — verify manually", "high-impact: independent second reviewer"],
    publicationBlockers: ["no published parent card yet", "NHS source verification pending", "second review required"],
  },
  {
    id: "what-a-neural-network-is", title: "What a neural network is", category: "Technology & AI", level: "beginner",
    highImpact: false, status: "READY FOR HUMAN REVIEW", contentState: "draft",
    hook: "Before the maths, see what a network actually does.",
    objective: "Understand how a model is trained and evaluated.",
    explanation: "A free, self-paced course introducing how machine-learning models are trained and evaluated.",
    sourceUrl: "https://developers.google.com/machine-learning/crash-course",
    claims: [
      { claim: "Training adjusts a model until predictions match known answers", source: "Google ML Crash Course", authority: "major technical publisher", method: "authoritative course (retrieved live, 37 passages)", directSupport: "yes", verificationDate: D, confidence: "high" },
      { claim: "Most practical work is preparing data, not choosing an algorithm", source: "ML field consensus", authority: "widely held in practice", method: "general consensus", directSupport: "indirect", verificationDate: D, confidence: "medium" },
    ],
    outstandingConcerns: [],
    publicationBlockers: ["no published parent card yet"],
    media: { title: "But what is a neural network?", creator: "3Blue1Brown", videoId: "aircAruvnKk", embedStatus: "verified-metadata", factualReview: "NOT fact-checked — a human must watch it" },
  },
  {
    id: "preparing-for-an-interview", title: "Preparing for an interview", category: "Career", level: "beginner",
    highImpact: false, status: "READY FOR HUMAN REVIEW", contentState: "draft",
    hook: "Structure beats confidence in the room.",
    objective: "Prepare structured answers from real experience.",
    explanation: "Free UK careers guidance: research, structured answers about your experience, and good questions to ask.",
    sourceUrl: "https://nationalcareers.service.gov.uk/careers-advice/interview-advice",
    claims: [
      { claim: "A structured answer about a real situation beats a general claim", source: "National Careers Service", authority: "UK national careers service", method: "authoritative guidance (retrieved live, 40 passages)", directSupport: "yes", verificationDate: D, confidence: "high" },
    ],
    outstandingConcerns: [],
    publicationBlockers: ["no published parent card yet"],
  },
  {
    id: "writing-people-understand", title: "Writing people understand", category: "Communication", level: "beginner",
    highImpact: false, status: "READY FOR HUMAN REVIEW", contentState: "draft",
    hook: "Write for the reader with the least time and the most to lose.",
    objective: "Write so people understand the first time.",
    explanation: "The style guidance behind GOV.UK: plain words, short sentences, clear structure.",
    sourceUrl: "https://www.gov.uk/guidance/content-design/writing-for-gov-uk",
    sourceLimitation: "GOV.UK page is JS-heavy (1 passage) — confirm wording manually.",
    claims: [
      { claim: "Shorter sentences are not simpler ideas, only clearer ones", source: "GOV.UK / GDS", authority: "UK government digital service", method: "GDS style principles", directSupport: "indirect", verificationDate: D, confidence: "medium" },
    ],
    outstandingConcerns: ["confirm GDS wording (JS page)"],
    publicationBlockers: ["no published parent card yet"],
  },
  {
    id: "the-essence-of-calculus", title: "The essence of calculus", category: "Learning", level: "beginner",
    highImpact: false, status: "REVISION REQUIRED", contentState: "draft",
    hook: "Calculus makes sense once you see the idea, not the rules.",
    objective: "Build intuition before the mechanics.",
    explanation: "An introduction that builds intuition for rates of change and accumulation, so the formal rules make sense.",
    sourceUrl: "https://www.khanacademy.org/math/calculus-1",
    sourceLimitation: "Khan Academy is a JS single-page app (no extractable text) — add a crawlable text source or verify manually.",
    claims: [
      { claim: "Calculus is about how things change and how changes accumulate", source: "standard definition", authority: "mathematics", method: "definitional", directSupport: "yes", verificationDate: D, confidence: "high" },
      { claim: "Intuition before the rules makes them easier to learn", source: "the video's thesis", authority: "pedagogical view", method: "opinion/pedagogy", directSupport: "indirect", verificationDate: D, confidence: "medium" },
    ],
    outstandingConcerns: ["Khan source yields no text — add a crawlable source"],
    publicationBlockers: ["no published parent card yet", "source verification pending"],
    media: { title: "The essence of calculus", creator: "3Blue1Brown", videoId: "WUvTyaaNkzM", embedStatus: "verified-metadata", factualReview: "NOT fact-checked — a human must watch it" },
  },
  {
    id: "reading-the-evidence-on-black-holes", title: "Reading the evidence on black holes", category: "Science & Nature", level: "beginner",
    highImpact: false, status: "READY FOR HUMAN REVIEW", contentState: "draft",
    hook: "The strange part isn't the black hole — it's what happens to the information.",
    objective: "Understand what a black hole is, from a primary source.",
    explanation: "NASA's plain explanation of black holes, linking to the underlying science.",
    sourceUrl: "https://science.nasa.gov/universe/black-holes/",
    claims: [
      { claim: "A black hole is a region gravity is so strong nothing, not even light, escapes", source: "NASA", authority: "primary scientific authority", method: "VERIFIED against a retrieved NASA passage (overlap match)", directSupport: "yes", verificationDate: D, confidence: "high" },
      { claim: "Much about black holes is still an open research question", source: "NASA + physics literature", authority: "primary + academic", method: "independent research: the information paradox is unresolved", directSupport: "yes", verificationDate: D, confidence: "high" },
    ],
    outstandingConcerns: ["the hosted video covers the information paradox, which is UNRESOLVED — frame as open"],
    publicationBlockers: ["no published parent card yet"],
    media: { title: "Why Black Holes Could Delete The Universe", creator: "Kurzgesagt – In a Nutshell", videoId: "yWO-cvGETRQ", embedStatus: "verified-metadata", factualReview: "NOT fact-checked — frame the paradox as an open problem" },
  },
  {
    id: "perseverance-and-the-limits-of-grit", title: "Perseverance, and the limits of \"grit\"", category: "Personal development", level: "beginner",
    highImpact: false, status: "READY FOR HUMAN REVIEW", contentState: "draft",
    hook: "Persistence matters — but the science on 'grit' is more modest than the slogan.",
    objective: "Understand grit and, honestly, the evidence behind it.",
    explanation: "Grit — sustained passion and perseverance — and the academic debate: it is real but overlaps heavily with conscientiousness and predicts success only modestly.",
    sourceUrl: "https://en.wikipedia.org/wiki/Grit_(personality_trait)",
    claims: [
      { claim: "Grit overlaps heavily with conscientiousness", source: "Credé, Tynan & Harms (2017), JPSP meta-analysis (~88 studies)", authority: "peer-reviewed academic literature", method: "independent research", directSupport: "yes", verificationDate: D, confidence: "high" },
      { claim: "Its independent effect on success is small", source: "same meta-analysis", authority: "peer-reviewed", method: "independent research", directSupport: "yes", verificationDate: D, confidence: "medium" },
    ],
    outstandingConcerns: ["prefer citing the primary papers over Wikipedia at approval"],
    publicationBlockers: ["no published parent card yet"],
    media: { title: "Grit: The Power of Passion and Perseverance", creator: "TED (Angela Lee Duckworth)", videoId: "H14bBuluwB8", embedStatus: "verified-metadata", factualReview: "NOT fact-checked — the card carries the balancing evidence the talk omits" },
  },
  {
    id: "starting-to-program-with-python", title: "Starting to program with Python", category: "Technology & AI", level: "beginner",
    highImpact: false, status: "READY FOR HUMAN REVIEW", contentState: "draft",
    hook: "You learn to program by writing small programs, not by reading about them.",
    objective: "Follow a complete beginner's introduction to Python.",
    explanation: "The official Python tutorial: a structured, free introduction to programming with Python.",
    sourceUrl: "https://docs.python.org/3/tutorial/index.html",
    claims: [
      { claim: "Python is designed to be readable, which helps beginners", source: "Python Software Foundation docs", authority: "the language's maintainers", method: "authoritative (retrieved live, 38 passages)", directSupport: "yes", verificationDate: D, confidence: "high" },
    ],
    outstandingConcerns: [],
    publicationBlockers: ["no published parent card yet"],
    media: { title: "Learn Python - Full Course for Beginners", creator: "freeCodeCamp.org", videoId: "rfscVS0vtbw", embedStatus: "verified-metadata", factualReview: "NOT fact-checked — a human must watch it" },
  },
];

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested)
// ---------------------------------------------------------------------------

/** High-impact cards require an independent second reviewer before approval. */
export function requiresSecondReview(card: Pick<EditorialCard, "highImpact">): boolean {
  return card.highImpact;
}

/**
 * A qualitative evidence indicator from the RECORDED fields — never a fabricated
 * numeric confidence. "limited" when a source is blocked or a claim is
 * unsupported/contradicted; "strong" when every substantive claim is directly
 * supported with high confidence; "moderate" otherwise.
 */
export function evidenceQuality(card: Pick<EditorialCard, "claims" | "sourceLimitation">): "strong" | "moderate" | "limited" {
  if (card.sourceLimitation) return "limited";
  const substantive = card.claims.filter((c) => c.directSupport !== "n/a");
  if (substantive.some((c) => c.directSupport === "no")) return "limited";
  if (substantive.length > 0 && substantive.every((c) => c.directSupport === "yes" && c.confidence === "high")) return "strong";
  return "moderate";
}

export type DecisionAction = "approve" | "request_revision" | "reject" | "escalate";

export interface DecisionInput {
  action: DecisionAction;
  reviewerName: string;
  rationale: string;
  /** Set true when an independent second review has already occurred. */
  secondReviewDone?: boolean;
  card: Pick<EditorialCard, "highImpact">;
}

/** Reviewer names that must be refused — the generating agent is never a reviewer. */
export const AGENT_NAME_PATTERN = /\b(agent|claude|ai|bot|automated|assistant|gpt|llm)\b/i;

export function validateDecision(input: DecisionInput): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const actions: DecisionAction[] = ["approve", "request_revision", "reject", "escalate"];
  if (!actions.includes(input.action)) errors.push("invalid action");
  if (!input.reviewerName || input.reviewerName.trim().length < 2) errors.push("a reviewer name is required");
  else if (AGENT_NAME_PATTERN.test(input.reviewerName)) errors.push("the generating agent cannot act as the reviewer");
  if (!input.rationale || input.rationale.trim().length < 10) errors.push("a rationale (at least 10 characters) is required");
  if (input.action === "approve" && input.card.highImpact && !input.secondReviewDone) {
    errors.push("high-impact content requires an independent second review before approval");
  }
  return { ok: errors.length === 0, errors };
}
