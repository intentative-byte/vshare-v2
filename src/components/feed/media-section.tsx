import { MediaFeed } from "./media-feed";
import { approvedMediaToFeedItems } from "./media-view";
import type { ApprovedMediaRow } from "@/modules/feed/server";

/**
 * The approved-multimedia section of /learn. Renders nothing when there is no
 * approved media (the safe fallback), so the existing card feed is unchanged.
 */
export function LearnMediaSection({ rows }: { rows: ApprovedMediaRow[] }) {
  const items = approvedMediaToFeedItems(rows);
  if (items.length === 0) {
    return null;
  }
  return (
    <section aria-label="Approved multimedia" className="mt-8">
      <h2 className="mb-3 text-lg text-white">Watch and read</h2>
      <MediaFeed items={items} />
    </section>
  );
}
