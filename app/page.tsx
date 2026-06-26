import Link from "next/link";
import { ArrowRight, Brain, Layers3, Sparkles } from "lucide-react";
import { Button } from "@/components/Button";
import { DemoModeLink } from "@/components/DemoModeLink";

const features = [
  {
    title: "Personal learning feed",
    description: "Your feed adapts to your interests, goals, and saved resources.",
    icon: Sparkles,
  },
  {
    title: "Learning paths",
    description: "Follow simple paths that help you build skills step by step.",
    icon: Layers3,
  },
  {
    title: "Daily growth loop",
    description: "Complete small daily missions and keep your progress moving.",
    icon: Brain,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-mist text-ink">
      <section className="mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <h1 className="text-5xl font-black tracking-tight sm:text-7xl">Turn scrolling into growth.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Choose what you want to learn. VShare builds a feed that helps you improve every day.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login">
              <Button>
                Start learning
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
            <DemoModeLink href="/feed" variant="secondary">
              Explore feed
            </DemoModeLink>
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
