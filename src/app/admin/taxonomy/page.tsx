import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { isDatabaseConfigured } from "@/platform/env";
import { listCategoriesForAdmin, listTopicsForAdmin } from "@/modules/content/server";

export const metadata = { title: "Taxonomy" };

export default async function TaxonomyPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <PageHeader eyebrow="Admin" title="Taxonomy" />
        <ErrorState title="Unavailable" body="No service is configured." />
      </>
    );
  }

  const [categories, topics] = await Promise.all([
    listCategoriesForAdmin(),
    listTopicsForAdmin(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Taxonomy"
        description="Categories and topics. Changes are audited, and high-impact categories make their cards need a second reviewer."
      />
      <TaxonomyManager categories={categories} topics={topics} />
    </>
  );
}
