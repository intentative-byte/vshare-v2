"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { goalOptions, topicOptions } from "@/lib/data";
import { saveDemoOnboarding } from "@/lib/demo";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";

export function OnboardingForm() {
  const router = useRouter();
  const [topics, setTopics] = useState<string[]>(["AI", "Product"]);
  const [goals, setGoals] = useState<string[]>(["Learn AI tools"]);
  const [dailyMinutes, setDailyMinutes] = useState(20);
  const [headline, setHeadline] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit = useMemo(() => topics.length > 0 && goals.length > 0 && username.trim().length >= 3, [goals, topics, username]);

  function toggleValue(value: string, values: string[], setter: (next: string[]) => void) {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  function handleSubmit() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      if (!isSupabaseConfigured()) {
        // TODO: Reconnect Supabase by replacing this browser-only demo save with persisted profile/preferences writes.
        saveDemoOnboarding({
          username: username.trim().toLowerCase(),
          headline: headline.trim() || null,
          topics,
          goals,
          daily_minutes: dailyMinutes,
        });
        setMessage("Demo preferences saved locally. Building your learning feed...");
        router.push("/feed");
        router.refresh();
        return;
      }

      const profileResponse = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          headline: headline.trim() || null,
          interests: topics,
        }),
      });

      const preferencesResponse = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topics,
          goals,
          daily_minutes: dailyMinutes,
        }),
      });

      if (!profileResponse.ok || !preferencesResponse.ok) {
        setError("Sign in and configure Supabase before saving onboarding preferences.");
        return;
      }

      setMessage("Preferences saved. Building your learning feed...");
      router.push("/feed");
      router.refresh();
    });
  }

  return (
    <div className="rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
      <div className="space-y-2">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-violet-600">Onboarding</p>
        <h1 className="text-3xl font-black tracking-tight">Tune your learning loop</h1>
        <p className="text-slate-600">Choose what VShare should optimize for in your daily feed.</p>
      </div>

      <div className="mt-8 grid gap-6">
        <label className="block">
          <span className="text-sm font-bold text-slate-700">Username</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="intentionallearner"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-700">Headline</span>
          <input
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
            placeholder="What are you building or learning?"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          />
        </label>

        <section>
          <h2 className="text-sm font-bold text-slate-700">Topics</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {topicOptions.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => toggleValue(topic, topics, setTopics)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-bold transition",
                  topics.includes(topic)
                    ? "border-ink bg-ink text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                )}
              >
                {topic}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold text-slate-700">Goals</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {goalOptions.map((goal) => (
              <button
                key={goal}
                type="button"
                onClick={() => toggleValue(goal, goals, setGoals)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-bold transition",
                  goals.includes(goal)
                    ? "border-violet bg-violet text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                )}
              >
                {goal}
              </button>
            ))}
          </div>
        </section>

        <label className="block">
          <span className="text-sm font-bold text-slate-700">Daily learning target: {dailyMinutes} minutes</span>
          <input
            type="range"
            min="5"
            max="90"
            step="5"
            value={dailyMinutes}
            onChange={(event) => setDailyMinutes(Number(event.target.value))}
            className="mt-3 w-full accent-violet"
          />
        </label>

        <Button type="button" onClick={handleSubmit} disabled={!canSubmit || isPending}>
          Save preferences
        </Button>
      </div>

      {message ? <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}
