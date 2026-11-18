/**
 * Curriculum Planner — connects evergreen coverage gaps with TAI trend
 * proposals into a single prioritised plan.
 *
 * Balancing rule: essential evergreen material is reserved a minimum share of
 * every batch and is placed FIRST. A trending topic, however high its momentum,
 * can only fill slots left after essentials — it never displaces essential
 * educational material merely because it is popular.
 */
import type { CoverageGap, Level, PlannedSlot, TrendProposal } from "./types";

export interface PlanOptions {
  batchSize: number;
  /** Minimum fraction of the batch reserved for essential evergreen material. */
  evergreenFloor?: number; // default 0.7
  now?: string;
}

export function planCurriculum(
  gaps: CoverageGap[],
  trendProposals: TrendProposal[],
  options: PlanOptions,
): { slots: PlannedSlot[]; reservedEvergreen: number; trendCapacity: number; notes: string[] } {
  const floor = options.evergreenFloor ?? 0.7;
  const reservedEvergreen = Math.ceil(options.batchSize * floor);
  const trendCapacity = options.batchSize - reservedEvergreen;
  const notes: string[] = [];

  // Essentials first, by deficit (largest gap), then non-essential evergreen.
  const essentials = gaps
    .filter((g) => g.essential)
    .sort((a, b) => b.deficit - a.deficit);
  const otherEvergreen = gaps
    .filter((g) => !g.essential)
    .sort((a, b) => b.deficit - a.deficit);

  const slots: PlannedSlot[] = [];
  const pushGap = (g: CoverageGap, priority: number) =>
    slots.push({
      category: g.category,
      topic: g.topic,
      level: g.level,
      kind: "evergreen",
      priority,
      rationale: g.essential ? `essential coverage gap (deficit ${g.deficit})` : `evergreen gap (deficit ${g.deficit})`,
    });

  let priority = 0;
  for (const g of essentials) {
    if (slots.length >= options.batchSize) break;
    pushGap(g, (priority += 1));
  }

  // Only ADMISSIBLE trends (status proposed, not expired) can take trend slots,
  // and only up to trendCapacity — never beyond, and never ahead of essentials.
  const admissibleTrends = trendProposals
    .filter((t) => t.status === "proposed" && !t.expired && t.category && t.topic)
    .sort((a, b) => (b.momentum.momentum ?? 0) - (a.momentum.momentum ?? 0));

  let trendUsed = 0;
  for (const t of admissibleTrends) {
    if (trendUsed >= trendCapacity) {
      notes.push(`trend "${t.display}" deferred: trend capacity (${trendCapacity}) reached; essentials keep priority`);
      continue;
    }
    if (slots.length >= options.batchSize) break;
    slots.push({
      category: t.category as string,
      topic: t.topic as string,
      level: "beginner" as Level,
      kind: "trend",
      priority: (priority += 1),
      rationale: `emerging trend (momentum ${t.momentum.momentum}, ${t.credibility})`,
    });
    trendUsed += 1;
  }

  // Backfill any remaining slots with non-essential evergreen (never trends).
  for (const g of otherEvergreen) {
    if (slots.length >= options.batchSize) break;
    pushGap(g, (priority += 1));
  }

  if (admissibleTrends.length === 0) {
    notes.push("no admissible trends; batch is fully evergreen (correct default)");
  }

  return { slots, reservedEvergreen, trendCapacity, notes };
}
