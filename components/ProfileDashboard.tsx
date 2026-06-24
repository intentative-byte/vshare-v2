"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BarChart3, Bell, Bookmark, Compass, Flame, Gauge, Map, Target } from "lucide-react";
import { Button } from "@/components/Button";
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
            {(["silent", "partner", "coach"] as const).map((mode) => (
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
