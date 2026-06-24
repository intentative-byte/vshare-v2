import { getDigitalTwin } from "@/lib/digital-twin/twin-engine";
import { getPersonalEconomy } from "@/lib/economy/personal-economy";
import { getFocusEngine } from "@/lib/focus/focus-engine";
import type { LearningState } from "@/lib/types";

export type GovernanceSignal = {
  type: "drift" | "overload" | "burnout" | "fragmentation";
  severity: number;
  correction: string;
};

export function getAdaptiveGovernance(state: LearningState): GovernanceSignal[] {
  const twin = getDigitalTwin(state);
  const economy = getPersonalEconomy(state);
  const focus = getFocusEngine(state);
  const signals: GovernanceSignal[] = [];

  if (twin.drift.driftScore > 35) {
    signals.push({
      type: "drift",
      severity: twin.drift.driftScore,
      correction: "Return to the primary goal and complete the next milestone before adding new work.",
    });
  }

  if (state.goals.length + state.projects.filter((project) => project.status === "active").length > 5) {
    signals.push({
      type: "overload",
      severity: Math.min(100, (state.goals.length + state.projects.length) * 12),
      correction: "Reduce active goals or projects until the plan fits available time.",
    });
  }

  if (economy.resources.energy < 35) {
    signals.push({
      type: "burnout",
      severity: 100 - economy.resources.energy,
      correction: "Increase recovery allocation before pushing execution intensity.",
    });
  }

  if (focus.focusRisk > 35) {
    signals.push({
      type: "fragmentation",
      severity: focus.focusRisk,
      correction: focus.recommendations[0] ?? "Narrow the active focus area.",
    });
  }

  return signals.sort((a, b) => b.severity - a.severity);
}
