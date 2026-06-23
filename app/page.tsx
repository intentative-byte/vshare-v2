import Link from "next/link";
import { ArrowRight, Brain, Layers3, Sparkles } from "lucide-react";
import { Button } from "@/components/Button";

const features = [
  {
    title: "Personalized knowledge feed",
    description: "Supabase-backed preferences shape a topic-specific feed that improves with every saved resource.",
    icon: Sparkles,
  },
  {
    title: "Learning-first social graph",
    description: "Profiles, posts, and shared goals help members discover people who make their learning sharper.",
    icon: Layers3,
  },
  {
    title: "Continuous growth loops",
    description: "Onboarding captures intent, while API routes keep preferences, posts, and profiles in sync.",
    icon: Brain,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-mist text-ink">
      <section className="mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="mb-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-violet-700 shadow-soft">
            VShare v2 is rebuilt in this repository
          </p>
          <h1 className="text-5xl font-black tracking-tight sm:text-7xl">
            Turn your feed into a learning engine.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            VShare remembers what you care about, adapts to your goals, and surfaces high-signal resources from
            people building in the same direction.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login">
              <Button>
                Start learning
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
            <Link href="/explore">
              <Button variant="secondary">Explore demo feed</Button>
            </Link>
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-white/80 bg-white p-6 shadow-soft">
          <div className="rounded-[2rem] bg-ink p-6 text-white">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-violet-200">Today&apos;s path</p>
            <h2 className="mt-4 text-3xl font-black">AI product strategy</h2>
            <div className="mt-8 grid gap-3">
              {["Read one framework", "Save two examples", "Share one insight"].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
                  <span className="flex size-8 items-center justify-center rounded-full bg-white text-sm font-black text-ink">
                    {index + 1}
                  </span>
                  <span className="font-semibold">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="flex gap-4 rounded-3xl bg-mist p-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-700">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-black">{feature.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
