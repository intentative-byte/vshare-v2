import { notFound } from "next/navigation";
import { areDevToolsEnabled } from "@/platform/env";
import { PageHeader } from "@/components/ui/page-header";
import { EditorialWorkbench } from "@/components/editorial/editorial-workbench";
import { ORIGINALS_EDITORIAL } from "@/components/editorial/editorial-data";

export const metadata = { title: "Editorial workbench (preview)" };

/**
 * Development-only PREVIEW of the Editorial Review Workbench, so it can be
 * checked for accessibility without an auth service. Never served in production
 * (404), which security-headers.spec.ts asserts. The real, reviewer-only surface
 * is /admin/editorial, gated by the admin layout's staff check.
 */
export default function EditorialWorkbenchPreview() {
  if (!areDevToolsEnabled()) {
    notFound();
  }
  return (
    <>
      <PageHeader
        eyebrow="Developer"
        title="Editorial workbench (preview)"
        description="Accessibility preview of the reviewer workbench. The real surface is /admin/editorial (staff-only). Development-only."
      />
      <EditorialWorkbench cards={ORIGINALS_EDITORIAL} />
    </>
  );
}
