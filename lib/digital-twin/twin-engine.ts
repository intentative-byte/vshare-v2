import { getDriftEngine } from "@/lib/drift/drift-engine";
import { getMomentumEngine } from "@/lib/momentum/momentum-engine";
import { getConsistencyModel } from "@/lib/state/consistency-model";
import { getCurrentPosition } from "@/lib/state/current-state";
import { getExecutionModel } from "@/lib/state/execution-model";
import { getStateGapMap } from "@/lib/state/gap-map";
import { getTargetState } from "@/lib/state/target-state";
import { getUserTimelines } from "@/lib/timeline/user-timeline";
import type { LearningState } from "@/lib/types";

export function getTwinAccuracy(state: LearningState) {
  const signalCoverage = Math.min(35, state.signals.length * 1.5);
  const goalCoverage = Math.min(20, state.goals.length * 8);
  const outcomeCoverage = Math.min(25, state.outcomes.length * 8);
  const projectCoverage = Math.min(20, state.projects.length * 7);

  return Math.round(signalCoverage + goalCoverage + outcomeCoverage + projectCoverage);
}

export function getDigitalTwin(state: LearningState) {
  return {
    currentState: getCurrentPosition(state),
    targetState: getTargetState(state),
    gapMap: getStateGapMap(state),
    executionModel: getExecutionModel(state),
    consistencyModel: getConsistencyModel(state),
    drift: getDriftEngine(state),
    momentum: getMomentumEngine(state),
    timelines: getUserTimelines(state),
    twinAccuracy: getTwinAccuracy(state),
  };
}
