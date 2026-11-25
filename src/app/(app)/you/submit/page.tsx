import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";
import { SubmitForm } from "@/components/submissions/submit-form";
import { isDatabaseConfigured } from "@/platform/env";
import { listCategories, findCategoryWithTopics } from "@/modules/content/server";

export const metadata = { title: "Submit a resource" };

export default async function SubmitPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <PageHeader eyebrow="You" title="Submit a resource" />
        <ErrorState title="This is unavailable" body="No service is configured." />
      </>
    );
  }

  // Topics are offered grouped by category, so the choice is obvious.
  const categories = await listCategories();
  const groups = await Promise.all(
    categories.map(async (category) => {
      const found = await findCategoryWithTopics(category.slug);
      return { category: category.name, topics: found?.topics ?? [] };
    }),
  );

  return (
    <>
      <PageHeader
        eyebrow="You"
        title="Submit a resource"
        description="Recommend something genuinely useful. A person reads every submission before it is published."
      />
      <SubmitForm groups={groups} />
    </>
  );
}
