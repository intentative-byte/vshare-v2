import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";
import { FeedClient } from "@/components/feed/feed-client";
import { LearnMediaSection } from "@/components/feed/media-section";
import { listApprovedMedia } from "@/modules/feed/server";
import { isDatabaseConfigured } from "@/platform/env";

export const metadata = { title: "Learn" };

type SearchParams = Promise<{ topic?: string }>;

/**
 * The Value Feed.
 *
 * A session of a known length, then a stopping point. The server renders
 * the shell; the session itself is fetched on the client so that a guest
 * account is created by the first real action rather than by loading a page.
 */
export default async function LearnPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  // The description states what the feed is for, which is true whether or
  // not there is a catalogue behind it today.
  const header = (
    <PageHeader
      eyebrow="Learn"
      title="Your value feed"
      description="Seven useful things, then a clear stopping point. Not designed to keep you scrolling."
    />
  );

  if (!isDatabaseConfigured()) {
    return (
      <>
        {header}
        <ErrorState
          title="The feed is unavailable"
          body="This instance has no catalogue service configured, so there is nothing to recommend."
        />
      </>
    );
  }

  // Approved, published media (RLS-gated; [] when migration 9 is not applied),
  // rendered below the value session. When there is none, nothing is added and
  // the existing card feed is unchanged.
  const media = await listApprovedMedia();

  return (
    <>
      {header}
      <FeedClient topicSlug={params.topic ?? null} />
      <LearnMediaSection rows={media} />
    </>
  );
}
