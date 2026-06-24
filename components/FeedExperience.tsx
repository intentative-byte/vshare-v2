"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame, RotateCw, Zap } from "lucide-react";
import { Button } from "@/components/Button";
import { ContributionComposer } from "@/components/ContributionComposer";
import { MediaStreamItem } from "@/components/MediaStreamItem";
import { learningContent } from "@/lib/data";
import { buildLearningStream, getInitialStreamIndex, getPrefetchQueue } from "@/lib/feed-engine/stream";
import {
  getProgressStats,
  markContentCompleted,
  markContentShared,
  markContentViewed,
  markNotInterested,
  markReplay,
  markScrollAway,
  recordFeedActivity,
  recordViewStarted,
  recordWatchTime,
  toggleLikedContent,
  toggleSavedContent,
  useLearningState,
} from "@/lib/learning";
import { getTrendingToday } from "@/lib/trending/trending-today";

const feedPageSize = 6;

export function FeedExperience() {
  const learningState = useLearningState();
  const [visibleCount, setVisibleCount] = useState(feedPageSize);
  const [isHydrating, setIsHydrating] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const streamItems = useMemo(() => buildLearningStream(learningState), [learningState]);
  const stats = useMemo(() => getProgressStats(learningState), [learningState]);
  const trendingItems = useMemo(() => getTrendingToday(learningState), [learningState]);
  const initialStreamIndex = useMemo(() => getInitialStreamIndex(learningState, streamItems), [learningState, streamItems]);
  const visibleContent = streamItems.slice(0, Math.max(visibleCount, initialStreamIndex + feedPageSize));
  const prefetchQueue = getPrefetchQueue(streamItems, Math.max(0, visibleCount - 1));
  const lastViewedContent = learningContent.find((content) => content.id === learningState.memory.lastViewedContentId);

  useEffect(() => {
    recordFeedActivity();
    const frameId = requestAnimationFrame(() => setIsHydrating(false));
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel) {
      return () => {};
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((currentCount) => Math.min(currentCount + feedPageSize, streamItems.length));
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [streamItems.length]);

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
    <div className="grid gap-5">
      <section className="rounded-[2rem] bg-ink p-5 text-white shadow-soft sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-violet-200">For you</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">Learning stream</h1>
            <p className="mt-3 max-w-2xl leading-7 text-slate-300">
              Swipe through new, relevant, unseen lessons. The stream adapts as you watch, skip, like, and save.
            </p>
            <div className="mt-4 rounded-3xl bg-white/10 p-4">
              <p className="text-sm font-black text-violet-100">Highest leverage action</p>
              <p className="mt-1 text-sm leading-6 text-slate-200">
                Goal: {stats.goalOS.currentGoal?.title ?? "Set a destination"} · Milestone:{" "}
                {stats.goalOS.nextMilestone?.label ?? "Choose the next target"}
              </p>
              <p className="mt-1 text-lg font-black leading-6 text-white">{stats.personalDashboard.recommendedNextAction.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-200">{stats.personalDashboard.recommendedNextAction.reason}</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                VAI confidence: {stats.vaiDecision.confidenceScore}% · Expected: {stats.vaiDecision.expectedOutcome}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                Twin: {stats.digitalTwin.momentum.momentumScore}% momentum · {stats.digitalTwin.drift.driftScore}% drift
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                Economy: stop {stats.economy.stopDoing.toLowerCase()} Double down on {stats.economy.doubleDown}.
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-200">Decision lens: {stats.decisionIntelligence.latestRecommendation}</p>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-violet-100">
                {stats.personalDashboard.recommendedNextAction.mode} · {stats.personalDashboard.recommendedNextAction.estimatedMinutes} min
              </p>
            </div>
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

      <section className="rounded-[2rem] border border-white/80 bg-white p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-600">{stats.mission.title}</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">{stats.mission.completionPercentage}% complete</h2>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-mist sm:w-48">
            <div className="h-full rounded-full bg-violet-600" style={{ width: `${stats.mission.completionPercentage}%` }} />
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {stats.mission.tasks.map((task) => (
            <div key={task.id} className="rounded-2xl bg-mist p-3">
              <p className="text-sm font-black">{task.label}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {task.current}/{task.target} {task.completed ? "done" : "left"}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-4 shadow-soft sm:p-5">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Capability missions</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          {stats.capability.missions.map((mission) => (
            <div key={mission.id} className="rounded-2xl bg-mist p-4">
              <p className="font-black">{mission.label}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{mission.target}</p>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-violet-700">
                {mission.completed ? "Complete" : "Next"}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white p-4 shadow-soft sm:p-5">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Recommended next concepts</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {stats.intelligence.recommendedNextConcepts.slice(0, 3).map((concept) => (
            <div key={`${concept.topic}-${concept.concept}`} className="rounded-2xl bg-mist p-4">
              <p className="font-black">{concept.concept}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">{concept.topic}</p>
            </div>
          ))}
        </div>
      </section>

      {(stats.completedCount > 0 || stats.viewedCount > 2) && <ContributionComposer />}

      <section className="rounded-[2rem] border border-white/80 bg-white p-4 shadow-soft sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="size-5 text-violet-700" />
            <h2 className="text-xl font-black tracking-tight">Trending Today</h2>
          </div>
          <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Discovery</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
          {trendingItems.map((item) => (
            <div key={item.content.id} className="min-w-64 rounded-3xl bg-mist p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">
                {item.content.contentType.replace("_", " ")}
              </p>
              <h3 className="mt-2 line-clamp-2 text-lg font-black tracking-tight">{item.content.title}</h3>
              <p className="mt-2 text-sm font-semibold text-slate-500">{item.trendScore} trend score</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500 shadow-soft">
        <Zap className="size-4 text-violet-700" />
        Prefetching next: {prefetchQueue.length ? prefetchQueue.join(", ") : "ready"}
      </div>

      <section className="grid max-h-none snap-y gap-4 overflow-visible scroll-smooth md:max-h-[calc(100svh-2rem)] md:overflow-y-auto md:pr-1">
        {isHydrating
          ? Array.from({ length: 2 }).map((_, index) => <StreamSkeleton key={index} />)
          : visibleContent.map((item) => (
              <MediaStreamItem
                key={item.content.id}
                item={item}
                isSaved={learningState.savedContentIds.includes(item.content.id)}
                isLiked={learningState.likedContentIds.includes(item.content.id)}
                isCompleted={learningState.completedContentIds.includes(item.content.id)}
                onStarted={recordViewStarted}
                onViewed={markContentViewed}
                onWatchTime={recordWatchTime}
                onScrollAway={markScrollAway}
                onComplete={markContentCompleted}
                onReplay={markReplay}
                onToggleSaved={toggleSavedContent}
                onToggleLiked={toggleLikedContent}
                onShare={markContentShared}
                onNotInterested={markNotInterested}
              />
            ))}
      </section>

      {visibleCount < streamItems.length ? (
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

function StreamSkeleton() {
  return (
    <div className="min-h-[calc(100svh-8rem)] animate-pulse snap-start overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-soft">
      <div className="min-h-[52svh] bg-slate-200" />
      <div className="grid gap-4 p-5">
        <div className="h-4 w-1/2 rounded-full bg-slate-200" />
        <div className="h-4 w-2/3 rounded-full bg-slate-200" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-20 rounded-2xl bg-slate-100" />
          <div className="h-20 rounded-2xl bg-slate-100" />
          <div className="h-20 rounded-2xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
