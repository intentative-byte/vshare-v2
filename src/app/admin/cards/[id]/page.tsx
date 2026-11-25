import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";
import { CardDetailView } from "@/components/admin/card-detail";
import { isDatabaseConfigured } from "@/platform/env";
import { getCardForAdmin } from "@/modules/content/server";

export const metadata = { title: "Card" };

type Params = Promise<{ id: string }>;

export default async function AdminCardPage({ params }: { params: Params }) {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <PageHeader eyebrow="Admin" title="Card" />
        <ErrorState title="Unavailable" body="No service is configured." />
      </>
    );
  }

  const { id } = await params;

  // A malformed id is a 404, not a server error.
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    notFound();
  }

  const card = await getCardForAdmin(id);

  if (!card) {
    notFound();
  }

  return (
    <>
      <PageHeader eyebrow="Admin" title="Card" description={`/${card.slug}`} />
      <CardDetailView card={card} />
    </>
  );
}
