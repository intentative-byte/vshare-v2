import type { Bottleneck, LeverageScore } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function calculateLeverageScore(input: {
  bottleneck: Bottleneck;
  availableMinutes: number;
  confidenceBase: number;
}): LeverageScore {
  const requiredEffort = clampScore(
    input.bottleneck.type === "knowledge_bottleneck"
      ? 25
      : input.bottleneck.type === "consistency_bottleneck"
        ? 15
        : input.bottleneck.type === "execution_bottleneck"
          ? 65
          : 45,
  );
  const timeToOutcome = clampScore(Math.max(10, 100 - input.availableMinutes));
  const potentialImpact = input.bottleneck.impact;
  const confidence = clampScore(input.confidenceBase + (input.availableMinutes >= requiredEffort ? 20 : -10));

  return {
    potentialImpact,
    requiredEffort,
    confidence,
    timeToOutcome,
    leverageScore: clampScore(potentialImpact * 0.38 + confidence * 0.28 + (100 - requiredEffort) * 0.18 + (100 - timeToOutcome) * 0.16),
  };
}
