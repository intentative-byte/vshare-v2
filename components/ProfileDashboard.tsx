"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BarChart3, Bell, Bookmark, Compass, Flame, Gauge, Map, Target } from "lucide-react";
import { Button } from "@/components/Button";
import { DecisionLogger } from "@/components/DecisionLogger";
import { GrowthPlanner } from "@/components/GrowthPlanner";
import { OutcomeLogger } from "@/components/OutcomeLogger";
import { getProgressStats, recordProfileActivity, setVaiMode, toggleFollowPath, useLearningState } from "@/lib/learning";
import { formatMinutes } from "@/lib/utils";

export function ProfileDashboard() {
  const learningState = useLearningState();
  const stats = getProgressStats(learningState);

  useEffect(() => {
    recordProfileActivity();
  }, []);

  return (
    <div className="grid gap-6">
      <section className="rounded-[2rem] bg-ink p-5 text-white shadow-soft sm:p-6">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-violet-200">Profile</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Your learning progress</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-300">
          VShare tracks what you view, what you save, and the interests shaping your next cards.
        </p>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Life operating system</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight">{stats.lifeOS.lifeAlignmentScore}% life alignment</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <DashboardRow label="Top opportunity" value={stats.lifeOS.commandCenter.topOpportunity} />
          <DashboardRow label="Top constraint" value={stats.lifeOS.commandCenter.topConstraint} />
          <DashboardRow label="Recommended action" value={stats.lifeOS.commandCenter.recommendedAction} />
          <DashboardRow label="North star" value={stats.lifeOS.northStar.highestLeverageObjective} />
          <DashboardRow label="Operator command" value={stats.lifeOS.operator.command} />
          <DashboardRow label="Governance" value={stats.lifeOS.governance[0]?.correction ?? "System is coherent enough to advance."} />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-5">
          <StatCard icon={Target} label="Knowledge" value={`${stats.lifeOS.systemHealth.knowledgeHealth}%`} />
          <StatCard icon={Target} label="Capability" value={`${stats.lifeOS.systemHealth.capabilityHealth}%`} />
          <StatCard icon={Target} label="Execution" value={`${stats.lifeOS.systemHealth.executionHealth}%`} />
          <StatCard icon={Target} label="Outcome" value={`${stats.lifeOS.systemHealth.outcomeHealth}%`} />
          <StatCard icon={Target} label="Focus" value={`${stats.lifeOS.systemHealth.focusHealth}%`} />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Collective intelligence</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight">{stats.collective.collectiveLearningGain}% collective learning gain</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <DashboardRow label="Proven path" value={stats.collective.provenPath} />
          <DashboardRow label="Successful behavior" value={stats.collective.successfulBehavior} />
          <DashboardRow label="Superior route" value={stats.collective.superiorRoute} />
          <DashboardRow label="Capability network" value={`${stats.collective.capabilityNetwork.edges.length} anonymized edges`} />
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {stats.collective.playbooks.slice(0, 3).map((playbook) => (
            <div key={playbook.id} className="rounded-2xl bg-mist p-4">
              <p className="font-black">{playbook.title}</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">{playbook.steps.join(" -> ")}</p>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-violet-700">{playbook.confidence}% confidence</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Market intelligence</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight">{stats.market.marketAlignmentScore}% market alignment</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <DashboardRow label="Emerging skill" value={stats.market.opportunities.emergingSkills[0]?.skill ?? "No signal yet"} />
          <DashboardRow label="Growing market" value={stats.market.opportunities.growingMarkets[0]?.industry ?? "Market signal forming"} />
          <DashboardRow label="Capability gap" value={stats.market.career.capabilityGapReport[0] ?? "No market gap detected"} />
          <DashboardRow label="Recommended job path" value={stats.market.career.recommendedJobs[0] ?? "Build more market evidence"} />
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {stats.market.skillDemand.slice(0, 3).map((skill) => (
            <div key={skill.skill} className="rounded-2xl bg-mist p-4">
              <p className="font-black">{skill.skill}</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                Demand {skill.demand}% - Growth {skill.growth}% - Opportunity {skill.opportunity}%
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard
          icon={Flame}
          label="Learning streak"
          value={`${stats.retention.dailyLearningStreak} day${stats.retention.dailyLearningStreak === 1 ? "" : "s"}`}
        />
        <StatCard icon={Bookmark} label="Saved items" value={String(stats.savedCount)} />
        <StatCard icon={Target} label="Completed items" value={String(stats.completedCount)} />
        <StatCard icon={BarChart3} label="Time completed" value={formatMinutes(stats.totalMinutes)} />
        <StatCard icon={Target} label="Resources shared" value={String(stats.resourcesShared)} />
        <StatCard icon={Target} label="Following" value={String(stats.followingCount)} />
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Personal dashboard</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight">{stats.growth.personalGrowthScore}% personal growth score</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <DashboardRow label="Current position" value={stats.personalDashboard.currentPosition} />
          <DashboardRow label="Desired position" value={stats.personalDashboard.desiredPosition} />
          <DashboardRow label="Progress gap" value={`${stats.personalDashboard.progressGap}%`} />
          <DashboardRow label="Top opportunity" value={stats.personalDashboard.topOpportunity} />
          <DashboardRow label="Top constraint" value={stats.personalDashboard.topConstraint} />
          <DashboardRow label="Recommended next action" value={stats.personalDashboard.recommendedNextAction.title} />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Strategic planning</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight">{stats.strategy.strategicAlignmentScore}% strategic alignment</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <DashboardRow label="Primary objective" value={stats.strategy.objectives.primaryObjective} />
          <DashboardRow label="Secondary objective" value={stats.strategy.objectives.secondaryObjective} />
          <DashboardRow label="Top constraint" value={`${stats.strategy.constraints[0]?.label ?? "No constraint"} - ${stats.strategy.constraints[0]?.reason ?? "Strategy forming"}`} />
          <DashboardRow label="Highest impact activity" value={stats.strategy.highestImpactActivities[0]?.activity ?? "Create a primary goal"} />
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-5">
          {stats.strategy.horizons.map((horizon) => (
            <div key={horizon.horizon} className="rounded-2xl bg-mist p-4">
              <p className="font-black">{horizon.horizon.replace("_", " ")}</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">{horizon.focus}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <DashboardRow label="Milestones" value={stats.strategy.roadmap.milestones.slice(0, 3).join(" -> ")} />
          <DashboardRow label="Projects" value={stats.strategy.roadmap.projects.slice(0, 2).join(" -> ")} />
          <DashboardRow label="Outcomes" value={stats.strategy.roadmap.outcomes.slice(0, 2).join(" -> ")} />
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <DashboardRow label="Weekly review" value={stats.strategy.reviews.weeklyReview[0]} />
          <DashboardRow label="Monthly review" value={stats.strategy.reviews.monthlyReview[0]} />
          <DashboardRow label="Quarterly review" value={stats.strategy.reviews.quarterlyReview[0]} />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Personal economy</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight">{stats.economy.leverageScore}% leverage score</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-5">
          <StatCard icon={Target} label="Time" value={`${stats.economy.resources.time}%`} />
          <StatCard icon={Target} label="Energy" value={`${stats.economy.resources.energy}%`} />
          <StatCard icon={Target} label="Attention" value={`${stats.economy.resources.attention}%`} />
          <StatCard icon={Target} label="Focus" value={`${stats.economy.resources.focus}%`} />
          <StatCard icon={Target} label="Money" value={`${stats.economy.resources.money}%`} />
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <DashboardRow label="Resource constraint" value={stats.economy.resourceConstraint.summary} />
          <DashboardRow label="Allocation" value={`${stats.economy.allocation.learning}% learning - ${stats.economy.allocation.outreach}% outreach - ${stats.economy.allocation.product}% product`} />
          <DashboardRow label="Opportunity cost" value={`${stats.economy.opportunityCost.opportunityCostScore}% - ${stats.economy.opportunityCost.tradeoff}`} />
          <DashboardRow label="Return on effort" value={`${stats.economy.returnOnEffort.returnOnEffort}% - ${stats.economy.returnOnEffort.summary}`} />
          <DashboardRow label="Stop doing" value={stats.economy.stopDoing} />
          <DashboardRow label="Double down" value={stats.economy.doubleDown} />
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className="rounded-3xl bg-mist p-4">
            <p className="font-black">Leverage opportunities</p>
            <div className="mt-3 grid gap-2">
              {stats.economy.leverageOpportunities.slice(0, 4).map((item) => (
                <p key={`${item.type}-${item.label}`} className="text-sm font-semibold text-slate-600">
                  {item.label} - {item.leverageScore}% leverage
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-mist p-4">
            <p className="font-black">Focus risks</p>
            <div className="mt-3 grid gap-2">
              {stats.economy.focus.recommendations.map((recommendation) => (
                <p key={recommendation} className="text-sm font-semibold text-slate-600">
                  {recommendation}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Digital twin</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight">{stats.digitalTwin.twinAccuracy}% twin accuracy</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <DashboardRow label="Current state" value={`${stats.digitalTwin.currentState.capabilityScore}% capability · ${stats.digitalTwin.currentState.knows.join(", ") || "Knowledge forming"}`} />
          <DashboardRow label="Target state" value={stats.digitalTwin.targetState.desiredPosition} />
          <DashboardRow label="Gap" value={`${stats.digitalTwin.gapMap.capabilityGap}% capability gap · ${stats.digitalTwin.gapMap.knowledgeGaps[0] ?? "No clear knowledge gap"}`} />
          <DashboardRow label="Momentum" value={`${stats.digitalTwin.momentum.momentumScore}% momentum · ${stats.digitalTwin.momentum.outcomeMomentum} recent outcomes`} />
          <DashboardRow label="Consistency" value={`${stats.digitalTwin.consistencyModel.consistencyScore}% · ${stats.digitalTwin.consistencyModel.weekly} active days this week`} />
          <DashboardRow label="Drift" value={`${stats.digitalTwin.drift.driftScore}% drift · ${stats.digitalTwin.executionModel.pattern}`} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <DashboardRow label="Knowledge timeline" value={`${stats.digitalTwin.timelines.knowledgeTimeline.length} events`} />
          <DashboardRow label="Capability timeline" value={`${stats.digitalTwin.timelines.capabilityTimeline.length} events`} />
          <DashboardRow label="Goal timeline" value={`${stats.digitalTwin.timelines.goalTimeline.length} events`} />
          <DashboardRow label="Outcome timeline" value={`${stats.digitalTwin.timelines.outcomeTimeline.length} events`} />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Future state</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight">{stats.trajectory.trajectoryAccuracy}% trajectory accuracy</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <DashboardRow label="Current path" value={stats.trajectory.currentPath} />
          <DashboardRow label="Projected path" value={stats.trajectory.projectedPath} />
          <DashboardRow label="Optimized path" value={stats.trajectory.optimizedPath} />
          <DashboardRow label="Identity shift" value={stats.futureState.identity.identityGap} />
          <DashboardRow label="Gap analysis" value={`${stats.futureState.gapAnalysis.gap}% capability gap`} />
          <DashboardRow label="Moving toward desired future" value={stats.trajectory.movingTowardDesiredFuture ? "Yes" : "Not yet"} />
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-4">
          {stats.futureState.futureStates.map((future) => (
            <div key={future.label} className="rounded-2xl bg-mist p-4">
              <p className="font-black">{future.label}</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">{future.summary}</p>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-violet-700">
                {future.capability}% capability - {future.outcomeVelocity}% outcome velocity
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3">
          {stats.futureState.gapAnalysis.requiredActions.map((action) => (
            <div key={action} className="rounded-2xl bg-violet-50 p-4 text-sm font-black text-violet-700">
              {action}
            </div>
          ))}
        </div>
      </section>

      <GrowthPlanner />

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Goal engine</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight">
          {stats.goalOS.currentGoal?.title ?? "Set a destination"}
        </h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <DashboardRow label="Progress" value={`${stats.goalOS.progress}%`} />
          <DashboardRow label="Next milestone" value={stats.goalOS.nextMilestone?.label ?? "Create a goal to generate milestones"} />
          <DashboardRow label="Top bottleneck" value={stats.goalOS.topBottleneck.reason} />
          <DashboardRow label="Recommended action" value={stats.goalOS.recommendedAction.title} />
          <DashboardRow label="Goal completion rate" value={`${stats.goalOS.goalCompletionRate}%`} />
          <DashboardRow
            label="Conflict check"
            value={stats.goalOS.conflicts.hasConflict ? stats.goalOS.conflicts.conflicts[0] : "No impossible schedule detected"}
          />
        </div>
        {stats.goalOS.roadmaps[0] ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <DashboardRow label="30 day plan" value={stats.goalOS.roadmaps[0].plan30Days.join(" -> ")} />
            <DashboardRow label="90 day plan" value={stats.goalOS.roadmaps[0].plan90Days.join(" -> ")} />
            <DashboardRow label="1 year plan" value={stats.goalOS.roadmaps[0].plan1Year.join(" -> ")} />
          </div>
        ) : null}
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Decision intelligence</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight">{stats.decisionIntelligence.decisionQualityScore}% decision quality</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <DashboardRow label="Highest leverage path" value={stats.decisionIntelligence.highestLeveragePath} />
          <DashboardRow label="Recommendation" value={stats.decisionIntelligence.latestRecommendation} />
          <DashboardRow label="Patterns" value={stats.decisionIntelligence.patterns.join(", ") || "Decision memory forming"} />
          <DashboardRow label="Memory" value={`${stats.decisionIntelligence.wins.length} wins · ${stats.decisionIntelligence.mistakes.length} mistakes`} />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">VAI decision engine</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight">{stats.vaiDecision.highestLeverageAction.title}</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <DashboardRow label="Top opportunity" value={stats.vaiDecision.topOpportunity} />
          <DashboardRow label="Top constraint" value={stats.vaiDecision.topConstraint} />
          <DashboardRow label="Recommended action" value={stats.vaiDecision.recommendedNextStep} />
          <DashboardRow label="Confidence score" value={`${stats.vaiDecision.confidenceScore}%`} />
          <DashboardRow label="Expected outcome" value={stats.vaiDecision.expectedOutcome} />
          <DashboardRow label="Leverage score" value={`${stats.vaiDecision.leverage.leverageScore}%`} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <DashboardRow label="Today" value={stats.vaiDecision.nextActions.today} />
          <DashboardRow label="This week" value={stats.vaiDecision.nextActions.thisWeek} />
          <DashboardRow label="This month" value={stats.vaiDecision.nextActions.thisMonth} />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Simulation engine</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight">
          {stats.simulation.bestPath?.optionLabel ?? "No path to simulate yet"}
        </h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <DashboardRow label="Best path expected progress" value={`${stats.simulation.bestPath?.expectedProgress ?? 0}%`} />
          <DashboardRow label="Decision confidence" value={`${stats.simulation.decisionConfidence.before}% -> ${stats.simulation.decisionConfidence.after}%`} />
          <DashboardRow label="Execution risk" value={`${stats.simulation.risk.executionRisk}%`} />
          <DashboardRow label="Knowledge risk" value={`${stats.simulation.risk.knowledgeRisk}%`} />
          <DashboardRow label="Resource risk" value={`${stats.simulation.risk.resourceRisk}%`} />
          <DashboardRow label="Focus risk" value={`${stats.simulation.risk.focusRisk}%`} />
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {stats.simulation.pathComparison.map((path) => (
            <div key={path.optionLabel} className="rounded-2xl bg-mist p-4">
              <p className="font-black">{path.optionLabel}</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                Risk {path.risk}% - Opportunity {path.opportunity}% - Progress {path.expectedProgress}%
              </p>
            </div>
          ))}
        </div>
        {stats.simulation.simulations[0] ? (
          <div className="mt-5 grid gap-3">
            {stats.simulation.simulations[0].projections.slice(0, 3).map((projection) => (
              <div key={projection.horizon} className="rounded-2xl bg-violet-50 p-4">
                <p className="font-black text-violet-700">{projection.horizon.replace("_", " ")}</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">{projection.expectedCase}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <DecisionLogger />

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Network intelligence</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight">{stats.networkIntelligence.overallTrustScore}% trust score</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <StatCard icon={Target} label="Learning trust" value={`${stats.networkIntelligence.trust.learningTrustScore}%`} />
          <StatCard icon={Target} label="Creator trust" value={`${stats.networkIntelligence.trust.creatorTrustScore}%`} />
          <StatCard icon={Target} label="Expert trust" value={`${stats.networkIntelligence.trust.expertTrustScore}%`} />
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <DashboardRow label="Knowledge network" value={`${stats.networkIntelligence.knowledgeNetwork.nodeCount} nodes · ${stats.networkIntelligence.knowledgeNetwork.edges.length} edges`} />
          <DashboardRow label="Reputation" value={`${stats.networkIntelligence.reputation.user.reputationScore}% reputation · ${stats.networkIntelligence.reputation.user.outcomeQuality}% outcome quality`} />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Capability engine</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight">{stats.capability.score.capabilityScore}% capability score</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          Capability delta: {stats.capability.score.capabilityDelta}% · Can you do more than before?
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Target} label="Learning score" value={`${stats.capability.score.learningScore}%`} />
          <StatCard icon={Target} label="Application score" value={`${stats.capability.score.applicationScore}%`} />
          <StatCard icon={Target} label="Execution score" value={`${stats.capability.score.executionScore}%`} />
          <StatCard icon={Target} label="Evidence score" value={`${stats.capability.score.evidenceScore}%`} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-5">
          {stats.capability.graph.map((node) => (
            <div key={node.dimension} className="rounded-2xl bg-mist p-4">
              <p className="text-sm font-black capitalize">{node.dimension}</p>
              <p className="mt-1 text-2xl font-black">{node.score}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{node.evidenceCount} evidence points</p>
            </div>
          ))}
        </div>
      </section>

      <OutcomeLogger />

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Outcome intelligence</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight">{stats.outcomeIntelligence.score.combinedOutcomeScore}% outcome score</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-4">
          <StatCard icon={Target} label="Execution score" value={`${stats.outcomeIntelligence.score.executionScore}%`} />
          <StatCard icon={Target} label="Outcome score" value={`${stats.outcomeIntelligence.score.outcomeScore}%`} />
          <StatCard icon={Target} label="Improvement score" value={`${stats.outcomeIntelligence.score.improvementScore}%`} />
          <StatCard icon={Target} label="Outcome velocity" value={`${stats.outcomeIntelligence.score.outcomeVelocity}%`} />
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <DashboardRow label="Velocity" value={`${stats.outcomeIntelligence.velocity.resultsPerMonth}/month · ${stats.outcomeIntelligence.velocity.resultsPerQuarter}/quarter · ${stats.outcomeIntelligence.velocity.resultsPerYear}/year`} />
          <DashboardRow label="Execution" value={`${stats.outcomeIntelligence.execution.attempts} attempts · ${stats.outcomeIntelligence.execution.successes} successes · ${stats.outcomeIntelligence.execution.iterations} iterations`} />
          <DashboardRow label="Compounding" value={`${stats.outcomeIntelligence.compounding.compoundingScore}% · knowledge ${stats.outcomeIntelligence.compounding.knowledgeGrowth}% · capability ${stats.outcomeIntelligence.compounding.capabilityGrowth}%`} />
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <OutcomeList title="What worked" items={stats.outcomeIntelligence.successAnalysis.worked} />
          <OutcomeList title="What failed" items={stats.outcomeIntelligence.successAnalysis.failed} />
          <OutcomeList title="What repeated" items={stats.outcomeIntelligence.successAnalysis.repeated} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <h2 className="text-2xl font-black tracking-tight">Outcome timeline</h2>
          <div className="mt-5 grid gap-3">
            {stats.outcomeIntelligence.timeline.length ? (
              stats.outcomeIntelligence.timeline.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-2xl bg-mist p-4">
                  <p className="font-black">{item.goal}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{item.action}</p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-violet-700">
                    {item.outcome} · {item.evidenceCount} evidence
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm font-semibold text-slate-500">Log outcomes to build your outcome timeline.</p>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <h2 className="text-2xl font-black tracking-tight">Attribution and playbooks</h2>
          <div className="mt-5 grid gap-3">
            {stats.outcomeIntelligence.attribution.slice(0, 2).map((item) => (
              <div key={item.outcome.id} className="rounded-2xl bg-mist p-4">
                <p className="font-black">{item.outcome.title}</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {item.contributors.slice(0, 3).map((contributor) => contributor.label).join(", ") || "Attribution forming"}
                </p>
              </div>
            ))}
            {stats.outcomeIntelligence.lessons.slice(0, 3).map((lesson) => (
              <div key={lesson.id} className="rounded-2xl bg-mist p-4">
                <p className="text-sm font-semibold leading-6 text-slate-700">{lesson.lesson}</p>
              </div>
            ))}
            {stats.outcomeIntelligence.playbooks.slice(0, 2).map((playbook) => (
              <div key={playbook.id} className="rounded-2xl bg-violet-50 p-4">
                <p className="font-black text-violet-700">{playbook.title}</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">{playbook.steps.join(" -> ")}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Personal learning map</p>
            <h2 className="mt-1 text-3xl font-black tracking-tight">{stats.intelligence.personalLearningMap.knowledgeGrowthScore}% growth score</h2>
            <p className="mt-3 text-sm font-semibold text-slate-600">
              Current: {stats.intelligence.personalLearningMap.currentPosition}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Target: {stats.intelligence.personalLearningMap.targetPosition}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {(["silent", "partner", "coach", "strategist", "operator"] as const).map((mode) => (
              <Button key={mode} type="button" variant={learningState.vaiMode === mode ? "primary" : "secondary"} onClick={() => setVaiMode(mode)}>
                {mode}
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {stats.intelligence.personalLearningMap.suggestedRoute.slice(0, 3).map((step) => (
            <div key={step} className="rounded-2xl bg-mist p-4 text-sm font-black">
              {step}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <h2 className="text-2xl font-black tracking-tight">Founder dashboard</h2>
          <div className="mt-5 grid gap-3">
            <MetricRow label="Knowledge growth" value={stats.capability.founderDashboard.knowledgeGrowth} />
            <MetricRow label="Capability growth" value={stats.capability.founderDashboard.capabilityGrowth} />
            <MetricRow label="Execution growth" value={stats.capability.founderDashboard.executionGrowth} />
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <h2 className="text-2xl font-black tracking-tight">Capability timeline</h2>
          <div className="mt-5 grid gap-3">
            {stats.capability.timeline.length ? (
              stats.capability.timeline.slice(0, 5).map((event) => (
                <div key={event.id} className="rounded-2xl bg-mist p-4">
                  <p className="font-black">{event.title}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{event.detail}</p>
                </div>
              ))
            ) : (
              <p className="text-sm font-semibold text-slate-500">Log outcomes or apply concepts to build your timeline.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <h2 className="text-2xl font-black tracking-tight">Goal roadmaps</h2>
          <div className="mt-5 grid gap-3">
            {stats.goalRoadmaps.length ? (
              stats.goalRoadmaps.slice(0, 4).map((roadmap) => (
                <div key={roadmap.goalId} className="rounded-2xl bg-mist p-4">
                  <p className="font-black">{roadmap.milestones[0]}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{roadmap.skillsRequired.join(", ") || "Build required skills"}</p>
                </div>
              ))
            ) : (
              <p className="text-sm font-semibold text-slate-500">Add a goal to generate a roadmap.</p>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <h2 className="text-2xl font-black tracking-tight">Time allocation</h2>
          <div className="mt-5 grid gap-3">
            <MetricRow label="Learning" value={stats.recommendedTimeAllocation.learning} />
            <MetricRow label="Building" value={stats.recommendedTimeAllocation.building} />
            <MetricRow label="Practicing" value={stats.recommendedTimeAllocation.practicing} />
            <MetricRow label="Teaching" value={stats.recommendedTimeAllocation.teaching} />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <h2 className="text-2xl font-black tracking-tight">Skill trees</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {stats.capability.skillTrees.map((tree) => (
            <div key={tree.tree} className="rounded-3xl bg-mist p-4">
              <div className="flex items-center justify-between">
                <p className="font-black">{tree.tree}</p>
                <p className="text-sm font-black text-violet-700">{tree.progressPercentage}%</p>
              </div>
              <div className="mt-4 grid gap-2">
                {tree.levels.map((level) => (
                  <div key={level.level} className="rounded-2xl bg-white p-3">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">{level.level}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-600">{level.skills.join(", ")}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <h2 className="text-2xl font-black tracking-tight">Knowledge graph scores</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {stats.intelligence.topicKnowledgeScores
            .filter((item) => !learningState.interests.length || learningState.interests.includes(item.topic))
            .slice(0, 6)
            .map((item) => (
              <div key={item.topic} className="rounded-3xl bg-mist p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black">{item.topic}</h3>
                  <span className="text-sm font-black text-violet-700">{item.score.masteryScore}% mastery</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <MiniScore label="Awareness" value={item.score.awarenessScore} />
                  <MiniScore label="Understanding" value={item.score.understandingScore} />
                  <MiniScore label="Application" value={item.score.applicationScore} />
                  <MiniScore label="Mastery" value={item.score.masteryScore} />
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <h2 className="text-2xl font-black tracking-tight">Learning gaps</h2>
          <div className="mt-5 grid gap-3">
            {stats.intelligence.learningGaps.slice(0, 5).map((gap) => (
              <div key={`${gap.topic}-${gap.concept}`} className="rounded-2xl bg-mist p-4">
                <p className="font-black">{gap.concept}</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {gap.topic} · {gap.status.replace("_", " ")}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{gap.reason}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <h2 className="text-2xl font-black tracking-tight">Learning journeys</h2>
          <div className="mt-5 grid gap-3">
            {stats.intelligence.learningJourneys.slice(0, 5).map((journey) => (
              <div key={`${journey.topic}-${journey.level}`} className="rounded-2xl bg-mist p-4">
                <p className="font-black capitalize">
                  {journey.topic} {journey.level}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-600">{journey.steps.join(" -> ")}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Activation loop</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">{stats.activation.percentage}% activated</h2>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-mist sm:w-56">
            <div className="h-full rounded-full bg-violet-600" style={{ width: `${stats.activation.percentage}%` }} />
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {stats.activation.steps.map((step) => (
            <div key={step.id} className="rounded-2xl bg-mist p-3">
              <p className="text-sm font-black">{step.label}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{step.completed ? "Complete" : "Next"}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <h2 className="text-2xl font-black tracking-tight">Creator profile</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Target} label="Followers" value={String(stats.creatorProfiles.find((creator) => creator.username === "you")?.followerCount ?? 0)} />
          <StatCard icon={Target} label="Creator score" value={String(stats.creatorProfiles.find((creator) => creator.username === "you")?.learningScore ?? 0)} />
          <StatCard icon={Target} label="Content count" value={String(stats.creatorProfiles.find((creator) => creator.username === "you")?.contentCount ?? 0)} />
          <StatCard icon={Target} label="Learning score" value={String(stats.retention.knowledgeConsistencyScore)} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <Gauge className="size-6 text-violet-700" />
            <h2 className="text-2xl font-black tracking-tight">Content health</h2>
          </div>
          <div className="mt-5 grid gap-3">
            <MetricRow label="Feed relevance score" value={stats.health.feedRelevanceScore} />
            <MetricRow label="Content completion rate" value={stats.health.contentCompletionRate} />
            <MetricRow label="Save rate" value={stats.health.saveRate} />
            <MetricRow label="Topic accuracy" value={stats.health.topicAccuracy} />
            <MetricRow label="Discovery effectiveness" value={stats.health.discoveryEffectiveness} />
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <Compass className="size-6 text-violet-700" />
            <h2 className="text-2xl font-black tracking-tight">Retention engine</h2>
          </div>
          <div className="mt-5 grid gap-3">
            <MetricRow label="Weekly learning score" value={stats.retention.weeklyLearningScore} />
            <MetricRow label="Knowledge consistency score" value={stats.retention.knowledgeConsistencyScore} />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <Map className="size-6 text-violet-700" />
          <h2 className="text-2xl font-black tracking-tight">Learning paths</h2>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {stats.learningPaths.map((path) => (
            <div key={path.id} className="rounded-3xl bg-mist p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">{path.primaryInterest}</p>
                  <h3 className="mt-1 text-xl font-black tracking-tight">{path.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{path.description}</p>
                </div>
                <Button type="button" variant={path.isFollowed ? "primary" : "secondary"} onClick={() => toggleFollowPath(path.id)}>
                  {path.isFollowed ? "Following" : "Follow"}
                </Button>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm font-black">
                  <span>
                    {path.completedCount}/{path.totalCount} complete
                  </span>
                  <span className="text-violet-700">{path.completionPercentage}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-violet-600" style={{ width: `${path.completionPercentage}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <h2 className="text-2xl font-black tracking-tight">Weekly recap</h2>
          <div className="mt-5 grid gap-3">
            <RecapRow label="Resources viewed" value={String(stats.weeklyRecap.resourcesViewed)} />
            <RecapRow label="Resources saved" value={String(stats.weeklyRecap.resourcesSaved)} />
            <RecapRow label="Topics learned" value={stats.weeklyRecap.topicsLearned.join(", ") || "None yet"} />
            <RecapRow label="Streak progress" value={`${stats.weeklyRecap.streakProgress} days`} />
          </div>
          <p className="mt-4 rounded-2xl bg-mist p-4 text-sm font-semibold leading-6 text-slate-600">
            {stats.weeklyRecap.growthSummary}
          </p>
        </div>

        <div className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <Bell className="size-6 text-violet-700" />
            <h2 className="text-2xl font-black tracking-tight">Notification framework</h2>
          </div>
          <div className="mt-5 grid gap-3">
            {stats.notifications.length ? (
              stats.notifications.map((intent) => (
                <div key={intent.id} className="rounded-2xl bg-mist p-4">
                  <p className="font-black">{intent.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{intent.body}</p>
                </div>
              ))
            ) : (
              <p className="text-sm font-semibold text-slate-500">No notification intents pending.</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <h2 className="text-2xl font-black tracking-tight">Product analytics</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard icon={Target} label="DAU" value={String(stats.productAnalytics.dau)} />
          <StatCard icon={Target} label="WAU" value={String(stats.productAnalytics.wau)} />
          <StatCard icon={Target} label="Content views" value={String(stats.productAnalytics.contentViews)} />
          <StatCard icon={Target} label="Save rate" value={`${stats.productAnalytics.saveRate}%`} />
          <StatCard icon={Target} label="Return rate" value={`${stats.productAnalytics.returnRate}%`} />
          <StatCard
            icon={Target}
            label="Avg session"
            value={formatMinutes(Math.round(stats.productAnalytics.averageSessionLengthSeconds / 60))}
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Interests</h2>
            <p className="mt-1 text-slate-600">These interests control your feed ranking.</p>
          </div>
          <Link href="/explore">
            <Button type="button" variant="secondary" className="w-full sm:w-auto">
              Edit interests
            </Button>
          </Link>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {learningState.interests.length ? (
            learningState.interests.map((interest) => (
              <span key={interest} className="rounded-full bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">
                {interest} {learningState.interestScores[interest]}
              </span>
            ))
          ) : (
            <p className="text-sm font-semibold text-slate-500">Choose interests to start building your profile.</p>
          )}
        </div>
      </section>
    </div>
  );
}

type StatCardProps = {
  icon: typeof Flame;
  label: string;
  value: string;
};

function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-mist text-violet-700">
        <Icon className="size-5" />
      </span>
      <p className="mt-4 text-sm font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
    </div>
  );
}

type MetricRowProps = {
  label: string;
  value: number;
};

function MetricRow({ label, value }: MetricRowProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm font-black">
        <span>{label}</span>
        <span className="text-violet-700">{value}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-mist">
        <div className="h-full rounded-full bg-violet-600" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function MiniScore({ label, value }: MetricRowProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs font-black text-slate-600">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-violet-600" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

type DashboardRowProps = {
  label: string;
  value: string;
};

function DashboardRow({ label, value }: DashboardRowProps) {
  return (
    <div className="rounded-2xl bg-mist p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">{value}</p>
    </div>
  );
}

type OutcomeListProps = {
  title: string;
  items: string[];
};

function OutcomeList({ title, items }: OutcomeListProps) {
  return (
    <div className="rounded-3xl bg-mist p-4">
      <p className="font-black">{title}</p>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <p key={item} className="text-sm font-semibold leading-6 text-slate-600">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

type RecapRowProps = {
  label: string;
  value: string;
};

function RecapRow({ label, value }: RecapRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-mist p-4">
      <span className="text-sm font-bold text-slate-600">{label}</span>
      <span className="text-right text-sm font-black">{value}</span>
    </div>
  );
}
