"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/Button";
import { InterestPicker } from "@/components/InterestPicker";
import { learningContent } from "@/lib/data";
import { recordExploreActivity, recordSearchActivity, saveInterests, useLearningState } from "@/lib/learning";
import type { Interest } from "@/lib/types";

export function ExploreExperience() {
  const learningState = useLearningState();
  const [query, setQuery] = useState(learningState.memory.lastSearchQuery);
  const searchResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return learningContent
      .filter((content) =>
        [content.title, content.summary, content.sourceLabel, ...content.interests].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        ),
      )
      .slice(0, 5);
  }, [query]);

  useEffect(() => {
    recordExploreActivity();
  }, []);

  function handleInterestsChange(interests: Interest[]) {
    const newlySelectedInterest = interests.find((interest) => !learningState.interests.includes(interest));

    saveInterests(interests);

    if (newlySelectedInterest) {
      recordExploreActivity(newlySelectedInterest);
    }
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    recordSearchActivity(query.trim());
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[2rem] bg-ink p-5 text-white shadow-soft sm:p-6">
        <div className="flex items-start gap-4">
          <span className="rounded-2xl bg-white/10 p-3 text-violet-200">
            <SlidersHorizontal className="size-6" />
          </span>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-violet-200">Explore</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">Tune your interests anytime.</h1>
            <p className="mt-3 max-w-2xl leading-7 text-slate-300">
              Changes are saved on this device and immediately recalibrate Feed, Saved, and Profile.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <InterestPicker selectedInterests={learningState.interests} onChange={handleInterestsChange} />
        <div className="mt-5 flex flex-col gap-3 rounded-3xl bg-mist p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black">{learningState.interests.length} interests selected</p>
            <p className="mt-1 text-sm text-slate-600">Your next feed refresh will prioritize unseen matching cards.</p>
          </div>
          <Link href="/feed">
            <Button type="button" className="w-full sm:w-auto">
              View feed
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <Search className="size-5 text-violet-700" />
          <h2 className="text-2xl font-black tracking-tight">Search learning topics</h2>
        </div>
        <form onSubmit={handleSearchSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search AI, finance, fitness..."
            className="min-h-12 flex-1 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          />
          <Button type="submit" disabled={!query.trim()} className="min-h-12">
            Search
          </Button>
        </form>
        {searchResults.length ? (
          <div className="mt-4 grid gap-3">
            {searchResults.map((content) => (
              <div key={content.id} className="rounded-2xl bg-mist p-4">
                <p className="font-black">{content.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{content.summary}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <h2 className="text-2xl font-black tracking-tight">Interest scores</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Object.entries(learningState.interestScores)
            .sort(([, aScore], [, bScore]) => bScore - aScore)
            .map(([interest, score]) => (
              <div key={interest} className="rounded-2xl bg-mist p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black">{interest}</p>
                  <p className="text-sm font-black text-violet-700">{score}</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-violet-600" style={{ width: `${score}%` }} />
                </div>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
