/**
 * Source verification and credibility.
 *
 * Deterministic classification from the URL and a small allowlist of
 * domain classes. This does NOT fetch the page (no network); a separate,
 * optional link-check adapter records `retrievedAt`. A source with no
 * identifiable reputable publisher is rejected.
 */
import type { SourceCandidate, SourceClass, SourceVerdict } from "./types";

/**
 * Curated allowlist of named reputable organisations whose domains do not match
 * a generic government/academic pattern. This is how real source verification
 * works: a reviewed list of trusted publishers, extended deliberately.
 */
const REPUTABLE_ORGS: Record<string, SourceClass> = {
  "moneyhelper.org.uk": "official", // UK government-backed money guidance
  "ico.org.uk": "official", // UK data-protection regulator
  "takefive-stopfraud.org.uk": "institution", // bank- and government-backed campaign
  "mind.org.uk": "institution",
  "citizensadvice.org.uk": "institution",
  "climate.nasa.gov": "official", // caught by .gov too; explicit for clarity
};

/** Named individual experts accepted as sources (exact hosts). */
const NAMED_EXPERT_HOSTS = new Set<string>(["augmentingcognition.com"]);

/** Explicitly distrusted host fragments (spam/low-trust); extendable. */
const BLOCKED_FRAGMENTS = ["example.com", "localhost", "bit.ly", "tinyurl.com"];

function hostOf(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null;
    return u.host.toLowerCase();
  } catch {
    return null;
  }
}

/** Classify a host into a trust class from stable public patterns. */
export function classifyHost(host: string): SourceClass {
  // Strip a leading www. so the allowlist matches both forms.
  const h = host.toLowerCase().replace(/^www\./, "");
  if (REPUTABLE_ORGS[h]) return REPUTABLE_ORGS[h];
  if (h.endsWith(".gov.uk") || h === "gov.uk" || h.endsWith(".nhs.uk") || h === "nhs.uk") {
    return "official";
  }
  if (h.endsWith(".gov") || h.endsWith(".int") || h.includes("europa.eu")) return "official";
  if (h.endsWith(".ac.uk") || h.endsWith(".edu") || h.includes("who.int")) return "institution";
  // Large, identifiable publishers of technical documentation.
  if (h === "developers.google.com" || h.endsWith(".service.gov.uk")) return "official";
  if (NAMED_EXPERT_HOSTS.has(h)) return "named_expert";
  return "unknown";
}

export function verifySource(source: SourceCandidate): SourceVerdict {
  const reasons: string[] = [];
  const host = hostOf(source.url);

  if (!host) {
    return { ok: false, reasons: ["url is not a valid https URL"], sourceClass: "unknown" };
  }
  for (const bad of BLOCKED_FRAGMENTS) {
    if (host.includes(bad)) {
      return { ok: false, reasons: [`host is blocked/low-trust: ${bad}`], sourceClass: "unknown" };
    }
  }
  if (!source.publisher || source.publisher.trim().length < 2) {
    reasons.push("publisher is not identifiable");
  }

  const sourceClass = classifyHost(host);
  if (sourceClass === "unknown") {
    reasons.push("publisher domain is not in a recognised reputable class");
  }

  // A source is acceptable only with an identifiable publisher AND a
  // recognised class (official/institution/named_expert). "community"/unknown
  // is not auto-accepted; it must be escalated to a human, so verify fails.
  const ok = reasons.length === 0;
  return { ok, reasons, sourceClass };
}

/** Credibility weight 0..1 used by TAI and the rubric. */
export function credibilityWeight(sourceClass: SourceClass): number {
  switch (sourceClass) {
    case "official":
      return 1;
    case "institution":
      return 0.9;
    case "named_expert":
      return 0.75;
    case "community":
      return 0.4;
    default:
      return 0.2;
  }
}
