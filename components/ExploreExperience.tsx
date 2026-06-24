"use client";

import Link from "next/link";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/Button";
import { InterestPicker } from "@/components/InterestPicker";
import { saveInterests, useLearningState } from "@/lib/learning";
import type { Interest } from "@/lib/types";

export function ExploreExperience() {
  const learningState = useLearningState();

  function handleInterestsChange(interests: Interest[]) {
    saveInterests(interests);
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
    </div>
  );
}
