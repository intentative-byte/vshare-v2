import type { LearningState, OutcomeExecutionRecord } from "@/lib/types";

function count(records: OutcomeExecutionRecord[], type: OutcomeExecutionRecord["type"]) {
  return records.filter((record) => record.type === type).length;
}

export function getExecutionEngine(state: LearningState) {
  const attempts = count(state.outcomeExecutions, "attempt");
  const successes = count(state.outcomeExecutions, "success") + state.outcomes.filter((outcome) => outcome.status === "completed" || outcome.status === "validated").length;
  const failures = count(state.outcomeExecutions, "failure");
  const iterations = count(state.outcomeExecutions, "iteration");

  return {
    attempts,
    successes,
    failures,
    iterations,
    successRate: attempts ? Math.round((successes / attempts) * 100) : successes ? 100 : 0,
    iterationRate: attempts ? Math.round((iterations / attempts) * 100) : 0,
  };
}
