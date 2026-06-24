"use client";

import Link from "next/link";
import { BarChart3, Bookmark, Flame, Target } from "lucide-react";
import { Button } from "@/components/Button";
import { getProgressStats, useLearningState } from "@/lib/learning";
import { formatMinutes } from "@/lib/utils";

export function ProfileDashboard() {
  const learningState = useLearningState();
  const stats = getProgressStats(learningState);

  return (
    <div className="grid gap-6">
      <section className="rounded-[2rem] bg-ink p-5 text-white shadow-soft sm:p-6">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-violet-200">Profile</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Your learning progress</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-300">
          VShare tracks what you view, what you save, and the interests shaping your next cards.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Flame} label="Learning streak" value={`${stats.streak} day${stats.streak === 1 ? "" : "s"}`} />
        <StatCard icon={Bookmark} label="Saved items" value={String(stats.savedCount)} />
        <StatCard icon={Target} label="Viewed items" value={String(stats.completedCount)} />
        <StatCard icon={BarChart3} label="Time completed" value={formatMinutes(stats.totalMinutes)} />
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
                {interest}
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
