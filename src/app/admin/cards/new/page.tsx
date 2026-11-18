import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";
import { CardForm } from "@/components/admin/card-form";
import { isDatabaseConfigured } from "@/platform/env";
import { listTopicsForAdmin } from "@/modules/content/server";

export const metadata = { title: "New card" };

export default async function NewCardPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <PageHeader eyebrow="Admin" title="New card" />
        <ErrorState title="Unavailable" body="No service is configured." />
      </>
    );
  }

  const topics = (await listTopicsForAdmin()).filter((topic) => topic.archivedAt === null);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="New card"
        description="A curated value card. It enters as a draft and takes the same review and link check as anything else."
      />
      <CardForm topics={topics} />
    </>
  );
}
