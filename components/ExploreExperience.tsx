"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, SlidersHorizontal, UserPlus } from "lucide-react";
import { Button } from "@/components/Button";
import { InterestPicker } from "@/components/InterestPicker";
import { learningContent } from "@/lib/data";
import { getProgressStats, recordExploreActivity, recordSearchActivity, saveInterests, toggleFollowCreator, useLearningState } from "@/lib/learning";
import type { CreatorProfile, Interest } from "@/lib/types";

export function ExploreExperience() {
  const learningState = useLearningState();
  const stats = getProgressStats(learningState);
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

  function topicStrengthLabel(score: number) {
    if (score >= 70) {
      return "Strong";
    }

    if (score >= 45) {
      return "Growing";
    }

    return "Starting";
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
            <p className="mt-1 text-sm text-slate-600">Your feed updates right away when these change.</p>
          </div>
          <Link href="/feed">
            <Button type="button" className="w-full sm:w-auto">
              View feed
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
        </div>
      </section>

      <CreatorDiscoverySection
        title="Featured Creators"
        creators={stats.creatorDiscovery.featured}
        followedCreatorIds={learningState.followedCreatorIds}
      />
      <CreatorDiscoverySection
        title="Trending Creators"
        creators={stats.creatorDiscovery.trending}
        followedCreatorIds={learningState.followedCreatorIds}
      />
      <CreatorDiscoverySection
        title="Rising Creators"
        creators={stats.creatorDiscovery.rising}
        followedCreatorIds={learningState.followedCreatorIds}
      />

      <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
        <h2 className="text-2xl font-black tracking-tight">Recommended for you</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl bg-mist p-4">
            <p className="font-black">People</p>
            <div className="mt-3 grid gap-3">
              {stats.networkIntelligence.matches.people.slice(0, 3).map((match) => (
                <div key={match.expert.id} className="rounded-2xl bg-white p-3">
                  <p className="font-black">{match.expert.name}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{match.reason}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-mist p-4">
            <p className="font-black">Resources</p>
            <div className="mt-3 grid gap-3">
              {stats.networkIntelligence.matches.resources.slice(0, 3).map((match) => (
                <div key={match.content.id} className="rounded-2xl bg-white p-3">
                  <p className="font-black">{match.content.title}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{match.reason}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-mist p-4">
            <p className="font-black">Learning paths</p>
            <div className="mt-3 grid gap-3">
              {stats.networkIntelligence.matches.paths.slice(0, 3).map((match) => (
                <div key={match.path.id} className="rounded-2xl bg-white p-3">
                  <p className="font-black">{match.path.title}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{match.reason}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-mist p-4">
            <p className="font-black">Projects</p>
            <div className="mt-3 grid gap-3">
              {stats.networkIntelligence.matches.projects.length ? (
                stats.networkIntelligence.matches.projects.slice(0, 3).map((match) => (
                  <div key={match.project.id} className="rounded-2xl bg-white p-3">
                    <p className="font-black">{match.project.title}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-600">{match.reason}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm font-semibold text-slate-600">Add a project to unlock project matches.</p>
              )}
            </div>
          </div>
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
        <h2 className="text-2xl font-black tracking-tight">Your topic mix</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Object.entries(learningState.interestScores)
            .sort(([, aScore], [, bScore]) => bScore - aScore)
            .map(([interest, score]) => (
              <div key={interest} className="rounded-2xl bg-mist p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black">{interest}</p>
                  <p className="text-sm font-black text-violet-700">{topicStrengthLabel(score)}</p>
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

type CreatorDiscoverySectionProps = {
  title: string;
  creators: CreatorProfile[];
  followedCreatorIds: string[];
};

function CreatorDiscoverySection({ title, creators, followedCreatorIds }: CreatorDiscoverySectionProps) {
  return (
    <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-3">
        <UserPlus className="size-5 text-violet-700" />
        <h2 className="text-2xl font-black tracking-tight">{title}</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {creators.map((creator) => {
          const isFollowed = followedCreatorIds.includes(creator.id);

          return (
            <div key={creator.id} className="rounded-3xl bg-mist p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black">{creator.name}</p>
                  <p className="text-sm font-semibold text-slate-500">@{creator.username}</p>
                </div>
                <Button type="button" variant={isFollowed ? "primary" : "secondary"} onClick={() => toggleFollowCreator(creator.id)}>
                  {isFollowed ? "Following" : "Follow"}
                </Button>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{creator.bio}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {creator.topics.map((topic) => (
                  <span key={topic} className="rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700">
                    {topic}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                {creator.followerCount} followers · {creator.learningScore}% learning match · {creator.contentCount} posts
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
