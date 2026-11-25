/**
 * TAI — Trend Artificial Intelligence.
 *
 * Identifies emerging educational opportunities from configurable, authorized
 * source adapters. It computes momentum from REAL observations only; it never
 * fabricates popularity. With too few observations or sources it returns
 * INSUFFICIENT_DATA; an unclassified or single-source trend is NOT_VERIFIED.
 * No live source is connected by default — adapters are injected, and the
 * fixture adapter returns inspectable fixtures.
 */
import type {
  MomentumResult,
  NormalizedTrend,
  SourceClass,
  TrendClassification,
  TrendObservation,
  TrendProposal,
  TrendSourceAdapter,
} from "./types";
import { titleSimilarity } from "./dedup";

export const TAI_DEFAULTS = {
  minObservations: 4,
  minSources: 2,
  clusterSimilarity: 0.6,
  ttlDays: 14,
  halfLifeDays: 7,
};

export interface TaiOptions {
  now: string; // ISO — fixed clock, required for deterministic output
  minObservations?: number;
  minSources?: number;
  clusterSimilarity?: number;
  ttlDays?: number;
  halfLifeDays?: number;
}

export interface ClassifyRule {
  category: string;
  topic: string;
  keywords: string[];
}

/** Normalise a raw term to a stable key. */
export function normalizeTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|a|an|of|for|to|in|on)\b/g, " ")
    .replace(/s\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Group observations by normalised term. */
export function normalizeTrends(observations: TrendObservation[]): NormalizedTrend[] {
  const byKey = new Map<string, NormalizedTrend>();
  for (const obs of observations) {
    const key = normalizeTerm(obs.term);
    if (!key) continue;
    const existing = byKey.get(key);
    if (existing) {
      existing.observations.push(obs);
      if (!existing.sources.includes(obs.sourceId)) existing.sources.push(obs.sourceId);
    } else {
      byKey.set(key, { key, display: obs.term, observations: [obs], sources: [obs.sourceId] });
    }
  }
  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/** Merge near-duplicate topic trends into clusters. */
export function clusterTrends(trends: NormalizedTrend[], similarity = TAI_DEFAULTS.clusterSimilarity): NormalizedTrend[] {
  const clusters: NormalizedTrend[] = [];
  for (const t of trends) {
    const match = clusters.find((c) => c.key === t.key || titleSimilarity(c.display, t.display) >= similarity);
    if (match) {
      match.observations.push(...t.observations);
      for (const s of t.sources) if (!match.sources.includes(s)) match.sources.push(s);
    } else {
      clusters.push({ key: t.key, display: t.display, observations: [...t.observations], sources: [...t.sources] });
    }
  }
  return clusters;
}

/** Momentum from real observations, with recency weighting. INSUFFICIENT_DATA guards. */
export function computeMomentum(trend: NormalizedTrend, options: TaiOptions): MomentumResult {
  const minObs = options.minObservations ?? TAI_DEFAULTS.minObservations;
  const minSrc = options.minSources ?? TAI_DEFAULTS.minSources;
  const halfLife = options.halfLifeDays ?? TAI_DEFAULTS.halfLifeDays;
  const now = new Date(options.now).getTime();

  const observationCount = trend.observations.length;
  const distinctSources = new Set(trend.observations.map((o) => o.sourceId)).size;

  if (observationCount < minObs || distinctSources < minSrc) {
    return {
      key: trend.key,
      status: "insufficient_data",
      observationCount,
      distinctSources,
      reason: `needs >=${minObs} observations from >=${minSrc} sources; have ${observationCount} from ${distinctSources}`,
    };
  }

  // Recency-weighted sum of signals (signal defaults to 1 per observation).
  let momentum = 0;
  for (const o of trend.observations) {
    const ageDays = Math.max(0, (now - new Date(o.observedAt).getTime()) / (1000 * 60 * 60 * 24));
    const weight = Math.pow(0.5, ageDays / halfLife);
    momentum += (o.signal ?? 1) * weight;
  }

  return {
    key: trend.key,
    status: "ok",
    observationCount,
    distinctSources,
    momentum: Math.round(momentum * 1000) / 1000,
    reason: "sufficient multi-source observations",
  };
}

/** Classify a trend to a taxonomy category/topic from keyword rules. */
export function classifyTrend(trend: NormalizedTrend, rules: ClassifyRule[]): TrendClassification {
  const hay = `${trend.key} ${trend.display.toLowerCase()}`;
  let best: { rule: ClassifyRule; hits: number } | null = null;
  for (const rule of rules) {
    const hits = rule.keywords.filter((k) => hay.includes(k.toLowerCase())).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { rule, hits };
  }
  if (!best) {
    return { key: trend.key, confidence: 0, status: "unclassified" };
  }
  return {
    key: trend.key,
    category: best.rule.category,
    topic: best.rule.topic,
    confidence: Math.min(1, best.hits / 2),
    status: "classified",
  };
}

/** Credibility from the source classes of a trend's observations. */
export function assessCredibility(
  trend: NormalizedTrend,
  classBySource: Record<string, SourceClass>,
): SourceClass | "mixed" {
  const classes = new Set(trend.sources.map((s) => classBySource[s] ?? "unknown"));
  if (classes.size === 1) return [...classes][0] ?? "unknown";
  return "mixed";
}

function educationalValue(classification: TrendClassification, momentum: MomentumResult, credible: boolean): number {
  let v = classification.status === "classified" ? 0.6 : 0.2;
  if (credible) v += 0.2;
  if (momentum.status === "ok") v += 0.2;
  return Math.round(Math.min(1, v) * 100) / 100;
}

export function proposeTrend(
  trend: NormalizedTrend,
  rules: ClassifyRule[],
  classBySource: Record<string, SourceClass>,
  options: TaiOptions,
): TrendProposal {
  const ttlDays = options.ttlDays ?? TAI_DEFAULTS.ttlDays;
  const now = new Date(options.now).getTime();

  const times = trend.observations.map((o) => new Date(o.observedAt).getTime()).sort((a, b) => a - b);
  const firstMs = times[0] ?? new Date(options.now).getTime();
  const lastMs = times[times.length - 1] ?? firstMs;
  const firstSeen = new Date(firstMs).toISOString();
  const lastSeen = new Date(lastMs).toISOString();
  const expiresAt = new Date(lastMs + ttlDays * 86400000).toISOString();
  const expired = now > new Date(expiresAt).getTime();

  const momentum = computeMomentum(trend, options);
  const classification = classifyTrend(trend, rules);
  const credibility = assessCredibility(trend, classBySource);
  const credible = credibility === "official" || credibility === "institution" || credibility === "mixed";
  const value = educationalValue(classification, momentum, credible);

  const reasons: string[] = [];
  let status: TrendProposal["status"] = "proposed";

  if (momentum.status === "insufficient_data") {
    status = "insufficient_data";
    reasons.push(momentum.reason);
  }
  if (classification.status === "unclassified") {
    status = status === "insufficient_data" ? status : "not_verified";
    reasons.push("could not be classified into the taxonomy");
  }
  if (credibility === "unknown" || credibility === "community") {
    status = status === "proposed" ? "not_verified" : status;
    reasons.push(`low source credibility: ${credibility}`);
  }
  if (expired) {
    reasons.push("trend has expired (older than TTL)");
  }
  if (status === "proposed" && reasons.length === 0) {
    reasons.push("multi-source, classified, credible and current");
  }

  return {
    key: trend.key,
    display: trend.display,
    category: classification.category,
    topic: classification.topic,
    momentum,
    credibility,
    educationalValue: value,
    firstSeen,
    lastSeen,
    expiresAt,
    expired,
    status,
    reasons,
  };
}

export interface TaiReport {
  generatedAt: string;
  sources: { id: string; sourceClass: SourceClass; observationCount: number }[];
  liveDataConnected: boolean;
  proposals: TrendProposal[];
  note: string;
}

/** Orchestrate: fetch adapters → normalize → cluster → propose. */
export async function runTai(
  adapters: TrendSourceAdapter[],
  rules: ClassifyRule[],
  options: TaiOptions,
): Promise<TaiReport> {
  const classBySource: Record<string, SourceClass> = {};
  const all: TrendObservation[] = [];
  const sources: TaiReport["sources"] = [];

  for (const adapter of adapters) {
    classBySource[adapter.id] = adapter.sourceClass;
    const obs = await adapter.fetch();
    sources.push({ id: adapter.id, sourceClass: adapter.sourceClass, observationCount: obs.length });
    all.push(...obs);
  }

  const clustered = clusterTrends(normalizeTrends(all), options.clusterSimilarity);
  const proposals = clustered
    .map((t) => proposeTrend(t, rules, classBySource, options))
    .sort((a, b) => (b.momentum.momentum ?? -1) - (a.momentum.momentum ?? -1));

  // Live data is "connected" only if at least one adapter is not a fixture.
  const liveDataConnected = adapters.some((a) => !a.id.startsWith("fixture"));

  return {
    generatedAt: options.now,
    sources,
    liveDataConnected,
    proposals,
    note: liveDataConnected
      ? "Live adapters connected."
      : "NO LIVE TREND SOURCE CONNECTED. Observations are illustrative fixtures; momentum is computed from them to demonstrate the algorithm. Real-world momentum is NOT VERIFIED.",
  };
}
