"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, Flame, TrendingUp } from "lucide-react";
import { Button } from "@/components/Button";
import { getProgressStats, recordProfileActivity, setVaiMode, useLearningState } from "@/lib/learning";
import type { LearningState } from "@/lib/types";

const vaiModes: Array<{ value: LearningState["vaiMode"]; label: string }> = [
  { value: "silent", label: "Quiet" },
  { value: "partner", label: "Suggest" },
  { value: "coach", label: "Challenge" },
  { value: "strategist", label: "Plan" },
  { value: "operator", label: "Coordinate" },
  { value: "governor", label: "Protect" },
];

export function ProfileDashboard() {
  const learningState = useLearningState();
  const stats = getProgressStats(learningState);

  useEffect(() => {
    recordProfileActivity();
  }, []);

  return (
    <div className="grid gap-5">
      <section className="rounded-[2rem] bg-ink p-5 text-white shadow-soft sm:p-6">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-violet-200">Profile</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Your command center</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-300">
          VShare keeps the full intelligence stack in the background and shows the signals that matter most.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard icon={TrendingUp} label="Growth Score" value={`${stats.vai.growthScore}%`} />
        <MetricCard icon={Flame} label="Streak" value={`${stats.streak} day${stats.streak === 1 ? "" : "s"}`} />
        <MetricCard icon={Bookmark} label="Saved Items" value={String(stats.savedCount)} />
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">VAI recommendation</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">{stats.vai.nextAction}</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{stats.vai.reason}</p>
          </div>
          <div className="grid gap-3 rounded-3xl bg-mist p-4">
            <SignalRow label="Current goal" value={stats.vai.currentGoal} />
            <SignalRow label="Top constraint" value={stats.vai.topConstraint} />
            <SignalRow label="Next milestone" value={stats.vai.nextMilestone} />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Guidance style</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {vaiModes.map((mode) => (
            <Button
              key={mode.value}
              type="button"
              variant={learningState.vaiMode === mode.value ? "primary" : "secondary"}
              onClick={() => setVaiMode(mode.value)}
            >
              {mode.label}
            </Button>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/feed">
          <Button type="button" className="w-full py-3">
            Open feed
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </Link>
        <Link href="/explore">
          <Button type="button" variant="secondary" className="w-full py-3">
            Tune interests
          </Button>
        </Link>
      </section>
    </div>
  );
}

type MetricCardProps = {
  icon: typeof TrendingUp;
  label: string;
  value: string;
};

function MetricCard({ icon: Icon, label, value }: MetricCardProps) {
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

type SignalRowProps = {
  label: string;
  value: string;
};

function SignalRow({ label, value }: SignalRowProps) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold leading-6 text-ink">{value}</p>
    </div>
  );
}
