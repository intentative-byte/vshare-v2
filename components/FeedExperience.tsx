"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCw } from "lucide-react";
import { Button } from "@/components/Button";
import { LearningCard } from "@/components/LearningCard";
import {
  getProgressStats,
  getRankedRecommendedContent,
  markContentCompleted,
  markContentShared,
  markContentSkipped,
  markContentViewed,
  recordFeedActivity,
  recordWatchTime,
  toggleSavedContent,
  useLearningState,
} from "@/lib/learning";
import { learningContent } from "@/lib/data";

const feedPageSize = 6;

export function FeedExperience() {
  const learningState = useLearningState();
  const [visibleCount, setVisibleCount] = useState(feedPageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const rankedContent = useMemo(() => getRankedRecommendedContent(learningState), [learningState]);
  const stats = useMemo(() => getProgressStats(learningState), [learningState]);
  const visibleContent = rankedContent.slice(0, visibleCount);
  const lastViewedContent = learningContent.find((content) => content.id === learningState.memory.lastViewedContentId);

  useEffect(() => {
    recordFeedActivity();
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel) {
      return () => {};
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((currentCount) => Math.min(currentCount + feedPageSize, rankedContent.length));
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [rankedContent.length]);

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
              Ranked from your topic scores, watch history, saves, completions, and recent activity.
            </p>
            {lastViewedContent ? (
              <button
                type="button"
                onClick={() => window.scrollTo({ top: learningState.memory.lastViewedPosition, behavior: "smooth" })}
                className="mt-4 rounded-full bg-white/10 px-4 py-2 text-left text-sm font-bold text-violet-100 transition hover:bg-white/15"
              >
                Continue from {lastViewedContent.title}
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-2xl font-black">{stats.unseenCount}</p>
              <p className="text-xs font-bold text-violet-100">Unseen</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-2xl font-black">{stats.viewedCount}</p>
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
            key={content.content.id}
            content={content.content}
            isSaved={learningState.savedContentIds.includes(content.content.id)}
            isViewed={learningState.viewedContentIds.includes(content.content.id)}
            isCompleted={learningState.completedContentIds.includes(content.content.id)}
            lane={content.lane}
            reasons={content.reasons}
            onToggleSaved={toggleSavedContent}
            onViewed={markContentViewed}
            onWatchTime={recordWatchTime}
            onComplete={markContentCompleted}
            onSkip={markContentSkipped}
            onShare={markContentShared}
          />
        ))}
      </div>

      {visibleCount < rankedContent.length ? (
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
