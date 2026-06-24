"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { Button } from "@/components/Button";
import { profileFromDemoOnboarding, useDemoOnboarding } from "@/lib/demo";
import type { Profile } from "@/lib/types";

type ProfileHeroProps = {
  initialProfile: Profile | null;
};

export function ProfileHero({ initialProfile }: ProfileHeroProps) {
  const demoOnboarding = useDemoOnboarding();
  const profile = initialProfile ? profileFromDemoOnboarding(initialProfile, demoOnboarding) : null;

  const interests = profile?.interests?.length ? profile.interests : ["AI", "Product", "Engineering"];

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-soft">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <div className="flex size-20 items-center justify-center rounded-[1.75rem] bg-ink text-3xl font-black text-white">
            {(profile?.full_name ?? profile?.username ?? "V").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-violet-600">Profile</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">
              {profile?.full_name ?? profile?.username ?? "VShare learner"}
            </h1>
            <p className="mt-2 text-slate-600">{profile?.headline ?? "Curating a sharper personal learning graph."}</p>
          </div>
        </div>
        <Link href="/onboarding">
          <Button variant="secondary">
            <Settings className="mr-2 size-4" />
            Edit preferences
          </Button>
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {interests.map((interest) => (
          <span key={interest} className="rounded-full bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700">
            {interest}
          </span>
        ))}
      </div>
    </section>
  );
}
