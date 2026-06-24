"use client";

import { useEffect, useState } from "react";
import { getDemoOnboarding, profileFromDemoOnboarding } from "@/lib/demo";
import type { Profile } from "@/lib/types";

type FeedHeroProps = {
  initialProfile: Profile | null;
};

export function FeedHero({ initialProfile }: FeedHeroProps) {
  const [profile, setProfile] = useState(initialProfile);

  useEffect(() => {
    if (!initialProfile) {
      return;
    }

    setProfile(profileFromDemoOnboarding(initialProfile, getDemoOnboarding()));
  }, [initialProfile]);

  const firstName = profile?.full_name?.split(" ")[0] ?? profile?.username;

  return (
    <section className="rounded-[2rem] bg-ink p-6 text-white shadow-soft">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-violet-200">Personal feed</p>
      <h1 className="mt-4 text-4xl font-black tracking-tight">
        {firstName ? `Welcome back, ${firstName}.` : "Your learning feed is ready."}
      </h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-300">
        High-signal resources are ranked by topic overlap, learning intent, and freshness. Configure Supabase to replace
        demo recommendations with your own network.
      </p>
    </section>
  );
}
