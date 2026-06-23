import Link from "next/link";
import { Settings, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { ContentCard } from "@/components/ContentCard";
import { getCurrentUserProfile, getFeedPosts } from "@/lib/queries";

export default async function ProfilePage() {
  const [profile, posts] = await Promise.all([getCurrentUserProfile(), getFeedPosts()]);
  const interests = profile?.interests?.length ? profile.interests : ["AI", "Product", "Engineering"];

  return (
    <AppShell active="profile">
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

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
        <aside className="rounded-[2rem] bg-ink p-6 text-white shadow-soft">
          <Sparkles className="size-8 text-violet-200" />
          <h2 className="mt-4 text-2xl font-black tracking-tight">Learning signal</h2>
          <p className="mt-3 leading-7 text-slate-300">
            Your saved interests and shared resources shape recommendations across the feed, explore page, and future
            creator matching.
          </p>
        </aside>
        <div className="grid gap-5">
          {posts.slice(0, 2).map((post) => (
            <ContentCard key={post.id} post={post} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
