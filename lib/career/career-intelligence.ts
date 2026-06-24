import { getSkillDemandScores } from "@/lib/demand/skill-demand";
import { getMarketGraph } from "@/lib/market/market-graph";
import type { LearningState } from "@/lib/types";

function userSkills(state: LearningState) {
  return Object.values(state.conceptProgress).map((progress) => progress.skill.toLowerCase());
}

export function getCareerIntelligence(state: LearningState) {
  const skills = userSkills(state);
  const demandScores = getSkillDemandScores();
  const matchedSkills = demandScores.filter((score) => skills.some((skill) => skill.includes(score.skill.toLowerCase())));
  const missingHighDemandSkills = demandScores
    .filter((score) => !matchedSkills.includes(score))
    .slice(0, 6);
  const jobs = getMarketGraph()
    .filter((node) => node.skills.some((skill) => matchedSkills.some((matched) => matched.skill === skill)))
    .flatMap((node) => node.jobs)
    .slice(0, 6);
  const marketAlignmentScore = Math.min(
    100,
    Math.round((matchedSkills.reduce((total, score) => total + score.opportunity, 0) / Math.max(1, demandScores.slice(0, 6).length)) * 0.8),
  );

  return {
    matchedSkills,
    missingHighDemandSkills,
    recommendedJobs: jobs.length ? jobs : getMarketGraph()[0].jobs,
    capabilityGapReport: missingHighDemandSkills.map((skill) => `${skill.skill}: ${skill.opportunity}% opportunity`),
    marketAlignmentScore,
  };
}
