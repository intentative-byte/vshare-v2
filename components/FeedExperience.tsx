"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCw } from "lucide-react";
import { Button } from "@/components/Button";
import { LearningCard } from "@/components/LearningCard";
import {
  getProgressStats,
  getRecommendedContent,
  markContentViewed,
  toggleSavedContent,
  useLearningState,
} from "@/lib/learning";

const feedPageSize = 6;

export function FeedExperience() {
  const learningState = useLearningState();
  const [visibleCount, setVisibleCount] = useState(feedPageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const recommendedContent = useMemo(() => getRecommendedContent(learningState), [learningState]);
  const stats = useMemo(() => getProgressStats(learningState), [learningState]);
  const visibleContent = recommendedContent.slice(0, visibleCount);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel) {
      return () => {};
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((currentCount) => Math.min(currentCount + feedPageSize, recommendedContent.length));
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [recommendedContent.length]);

  if (!learningState.interests.length) {
    return (
      <div className="mx-auto grid max-w-3xl gap-5">
        <section className="rounded-[2rem] bg-ink p-6 text-white shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-violet-200">First launch</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight">Set your interests to build your feed.</h1>
          <p className="mt-3 leading-7 text-slate-300">
            Pick a few areas you care about and VShare will prioritize unseen items for you.
          </p>
        </section>
        <Link href="/onboarding">
          <Button type="button" className="w-full py-3">
            Choose interests
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[2rem] bg-ink p-5 text-white shadow-soft sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-violet-200">For you</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">Today&apos;s learning feed</h1>
            <p className="mt-3 max-w-2xl leading-7 text-slate-300">
              Unseen cards are ranked first from your interests, saves, and viewing memory.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-2xl font-black">{stats.unseenCount}</p>
              <p className="text-xs font-bold text-violet-100">Unseen</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-2xl font-black">{stats.completedCount}</p>
              <p className="text-xs font-bold text-violet-100">Viewed</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-2xl font-black">{stats.streak}</p>
              <p className="text-xs font-bold text-violet-100">Streak</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleContent.map((content) => (
          <LearningCard
            key={content.id}
            content={content}
            isSaved={learningState.savedContentIds.includes(content.id)}
            isViewed={learningState.viewedContentIds.includes(content.id)}
            onToggleSaved={toggleSavedContent}
            onMarkViewed={markContentViewed}
          />
        ))}
      </div>

      {visibleCount < recommendedContent.length ? (
        <div ref={sentinelRef} className="flex justify-center py-4 text-sm font-bold text-slate-500">
          <RotateCw className="mr-2 size-4 animate-spin" />
          Loading more
        </div>
      ) : (
        <div ref={sentinelRef} className="rounded-[2rem] bg-white p-5 text-center font-semibold text-slate-600 shadow-soft">
          You&apos;re caught up for these interests. Visit Explore to widen the feed.
        </div>
      )}
    </div>
  );
}
