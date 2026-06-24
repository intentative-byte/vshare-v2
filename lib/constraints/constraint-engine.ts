import { detectBottlenecks } from "@/lib/bottlenecks/detect-bottlenecks";
import { getCapabilityScore } from "@/lib/capability/scoring";
import { getPersonalEconomy } from "@/lib/economy/personal-economy";
import type { LearningState } from "@/lib/types";

export type StrategicConstraint = {
  type: "knowledge" | "skill" | "time" | "capital";
  label: string;
  severity: number;
  reason: string;
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getStrategicConstraints(state: LearningState): StrategicConstraint[] {
  const bottlenecks = detectBottlenecks(state);
  const economy = getPersonalEconomy(state);
  const capability = getCapabilityScore(state);

  const constraints: StrategicConstraint[] = [
    {
      type: "knowledge",
      label: "Knowledge constraint",
      severity: bottlenecks.find((bottleneck) => bottleneck.type === "knowledge_bottleneck")?.impact ?? 0,
      reason: "Missing concepts slow strategic execution.",
    },
    {
      type: "skill",
      label: "Skill constraint",
      severity: clampScore(100 - capability.applicationScore),
      reason: "Skills must move from learned to applied.",
    },
    {
      type: "time",
      label: "Time constraint",
      severity: clampScore(100 - economy.resources.time),
      reason: economy.resourceConstraint.resource === "time" ? economy.resourceConstraint.summary : "Available time limits compounding.",
    },
    {
      type: "capital",
      label: "Capital constraint",
      severity: clampScore(100 - economy.resources.money),
      reason: "Financial slack and revenue outcomes affect strategic options.",
    },
  ];

  return constraints.sort((a, b) => b.severity - a.severity);
}
