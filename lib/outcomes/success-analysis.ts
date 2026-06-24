import { getOutcomeLabel } from "@/lib/outcomes/outcome-system";
import type { LearningState, OutcomeType } from "@/lib/types";

export function getSuccessAnalysis(state: LearningState) {
  const outcomesByType = new Map<string, number>();
  const outcomesByAction = new Map<string, number>();

  state.outcomes.forEach((outcome) => {
    outcomesByType.set(outcome.type, (outcomesByType.get(outcome.type) ?? 0) + 1);
    const actionKey = (outcome.action || outcome.description).toLowerCase().slice(0, 40);
    outcomesByAction.set(actionKey, (outcomesByAction.get(actionKey) ?? 0) + 1);
  });

  const repeated = Array.from(outcomesByAction.entries())
    .filter(([, count]) => count > 1)
    .map(([action, count]) => `${action} (${count}x)`);
  const worked = Array.from(outcomesByType.entries())
    .sort(([, aCount], [, bCount]) => bCount - aCount)
    .slice(0, 3)
    .map(([type, count]) => `${getOutcomeLabel(type as OutcomeType)}: ${count}`);
  const failed =
    state.decisions
      .filter((decision) => decision.outcome && decision.outcome.toLowerCase().includes("failed"))
      .map((decision) => decision.decision)
      .slice(0, 3) ?? [];

  return {
    worked: worked.length ? worked : ["No clear success pattern yet"],
    failed: failed.length ? failed : ["No repeated failure pattern yet"],
    repeated: repeated.length ? repeated : ["No repeated actions yet"],
  };
}
