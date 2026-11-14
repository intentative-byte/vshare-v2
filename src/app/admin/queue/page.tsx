import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { ModerationQueue } from "@/components/admin/moderation-queue";
import { getModerationQueue } from "@/modules/content";

export const metadata = { title: "Moderation queue" };

type SearchParams = Promise<{ status?: string }>;

const allowed = ["pending", "draft", "published", "rejected"] as const;
type Status = (typeof allowed)[number];

export default async function QueuePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status: Status = allowed.includes(params.status as Status)
    ? (params.status as Status)
    : "pending";

  const result = await getModerationQueue({ status });
  const cards = result.ok ? result.data : [];

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Moderation queue"
        description="Nothing is published without a review, a checked link, and — for finance and health — a second pair of eyes."
      />

      {!result.ok ? (
        <EmptyState
          title="The queue did not load"
          body="Your account may not have the role this page needs."
          action={{ href: "/learn", label: "Back to the app" }}
        />
      ) : cards.length === 0 ? (
        <EmptyState
          title={`Nothing ${status}`}
          body="When something arrives it will appear here, oldest first."
          action={{ href: "/admin/queue", label: "Show pending" }}
        />
      ) : (
        <ModerationQueue cards={cards} status={status} />
      )}
    </>
  );
}
