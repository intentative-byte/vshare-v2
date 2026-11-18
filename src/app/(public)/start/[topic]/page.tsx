import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { BrandLockup } from "@/components/shell/brand";
import { FirstWin } from "@/components/feed/first-win";
import { ErrorState } from "@/components/ui/states";
import { isDatabaseConfigured } from "@/platform/env";
import { findTopicBySlug } from "@/modules/content/server";
import { firstWinCard } from "@/modules/feed/server";

type Params = { topic: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { topic } = await params;
  return { title: `Start with ${topic.replace(/-/g, " ")}` };
}

/**
 * The first learning win.
 *
 * A visitor arrives from the home page having chosen a topic, and gets one
 * genuinely useful card. No account, no sign-up wall, nothing recorded
 * about them: reading is anonymous. An account appears only when they press
 * "Got it", because that is the first thing that has to survive.
 */
export default async function StartPage({ params }: { params: Promise<Params> }) {
  const { topic: topicSlug } = await params;

  if (!isDatabaseConfigured()) {
    return (
      <main id="content" className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center px-4">
        <h1 className="mb-4 text-3xl text-white">This is not available here</h1>
        <ErrorState
          title="No catalogue service is configured"
          body="This instance cannot serve learning content."
        />
      </main>
    );
  }

  const topic = await findTopicBySlug(topicSlug);

  if (!topic) {
    notFound();
  }

  const card = await firstWinCard(topic.id);

  return (
    <div className="min-h-svh">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-4 py-5 sm:px-6">
        <BrandLockup instanceId="start" />
        <Link href="/explore" className="text-sm font-semibold text-silver hover:text-white">
          Another topic
        </Link>
      </header>

      <main id="content" className="mx-auto max-w-2xl px-4 pb-16 sm:px-6">
        <h1 className="sr-only">Start learning: {topic.name}</h1>
        <FirstWin card={card} topicName={topic.name} topicId={topic.id} />
      </main>
    </div>
  );
}
