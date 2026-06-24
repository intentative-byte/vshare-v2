"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { InterestPicker } from "@/components/InterestPicker";
import { saveInterests, useLearningState } from "@/lib/learning";
import type { Interest } from "@/lib/types";

export function OnboardingForm() {
  const router = useRouter();
  const learningState = useLearningState();

  const canContinue = useMemo(() => learningState.interests.length > 0, [learningState.interests]);

  function handleInterestsChange(interests: Interest[]) {
    saveInterests(interests);
  }

  function handleSubmit() {
    router.push("/feed");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 rounded-[2rem] bg-ink p-6 text-white shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-violet-200">First launch</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">Choose what you want to learn.</h1>
        <p className="mt-3 leading-7 text-slate-300">
          VShare builds your feed from these interests and keeps improving as you view and save items.
        </p>
      </div>

      <div className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <InterestPicker selectedInterests={learningState.interests} onChange={handleInterestsChange} />
        <Button type="button" onClick={handleSubmit} disabled={!canContinue} className="mt-5 w-full py-3">
          Start my feed
        </Button>
      </div>
    </div>
  );
}
