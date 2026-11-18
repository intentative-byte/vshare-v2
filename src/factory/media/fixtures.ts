/**
 * Media demonstration fixtures.
 *
 * The five videos are REAL, well-known educational videos whose existence and
 * channel attribution were confirmed via YouTube oEmbed (see the gated
 * media-verification run). The educational objective, category, topic and level
 * are editorial proposals, confirmed at human review. `liveVerified` is
 * "not_verified" in the static fixture and set to "verified" by an oEmbed run.
 * Nothing is downloaded or rehosted — these are embeds only.
 */
import type { ImageCard, MediaCard, TextCard, VideoCandidate } from "./types";
import { canonicalUrl } from "./providers";

function yt(
  id: string,
  channel: string,
  channelUrl: string,
  title: string,
  category: string,
  topic: string,
  objective: string,
  level: VideoCandidate["level"],
): VideoCandidate {
  return {
    kind: "video",
    provider: "youtube",
    providerId: id,
    originalUrl: canonicalUrl("youtube", id),
    channel,
    channelUrl,
    title,
    category,
    topic,
    objective,
    level,
    embeddable: true,
    captionsAvailable: true,
    liveVerified: "not_verified",
    reviewStatus: "draft",
  };
}

export const DEMO_VIDEOS: VideoCandidate[] = [
  yt(
    "aircAruvnKk",
    "3Blue1Brown",
    "https://www.youtube.com/@3blue1brown",
    "But what is a neural network? | Deep learning chapter 1",
    "technology-and-ai",
    "ai-foundations",
    "See, visually, what a neural network is and how it represents a function.",
    "intermediate",
  ),
  yt(
    "yWO-cvGETRQ",
    "Kurzgesagt – In a Nutshell",
    "https://www.youtube.com/@kurzgesagt",
    "Why Black Holes Could Delete The Universe – The Information Paradox",
    "science-and-nature",
    "space-basics",
    "Understand what the black-hole information paradox is and why it matters.",
    "beginner",
  ),
  yt(
    "WUvTyaaNkzM",
    "3Blue1Brown",
    "https://www.youtube.com/@3blue1brown",
    "The essence of calculus",
    "learning-how-to-learn",
    "deliberate-practice",
    "Build intuition for what calculus is really about before the mechanics.",
    "beginner",
  ),
  yt(
    "H14bBuluwB8",
    "TED",
    "https://www.youtube.com/@TED",
    "Grit: The Power of Passion and Perseverance | Angela Lee Duckworth",
    "personal-development-and-mindset",
    "goal-setting",
    "Understand what 'grit' is and the evidence that it predicts achievement.",
    "beginner",
  ),
  yt(
    "rfscVS0vtbw",
    "freeCodeCamp.org",
    "https://www.youtube.com/@freecodecamp",
    "Learn Python - Full Course for Beginners",
    "technology-and-ai",
    "software-and-building",
    "Follow a complete beginner's introduction to programming with Python.",
    "beginner",
  ),
];

export const DEMO_IMAGE_CARD: ImageCard = {
  kind: "image",
  imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/placeholder.svg",
  alt: "Illustration placeholder for a licensed educational image.",
  credit: "Licensed educational image (placeholder)",
  licence: "CC-BY (example)",
  title: "How compound interest grows over time",
  category: "personal-finance",
  topic: "saving-and-investing-basics",
  objective: "See how small, regular saving compounds over years.",
  level: "beginner",
  reviewStatus: "draft",
};

export const DEMO_TEXT_CARD: TextCard = {
  kind: "text",
  title: "A consistent wake time helps you sleep",
  body: "A regular wake time, even at weekends, does more for sleep quality than a fixed bedtime. Persistent problems are worth raising with a doctor.",
  category: "health-and-wellbeing",
  topic: "sleep",
  objective: "Apply one evidence-led habit that improves sleep.",
  level: "beginner",
  source: { publisher: "NHS", url: "https://www.nhs.uk/live-well/sleep-and-tiredness/how-to-get-to-sleep/" },
  reviewStatus: "draft",
};

/** A mixed-format session: videos interleaved with an image and a text card. */
export const DEMO_MIXED_FEED: MediaCard[] = [
  DEMO_VIDEOS[0]!,
  DEMO_TEXT_CARD,
  DEMO_VIDEOS[1]!,
  DEMO_VIDEOS[2]!,
  DEMO_IMAGE_CARD,
  DEMO_VIDEOS[3]!,
  DEMO_VIDEOS[4]!,
];
