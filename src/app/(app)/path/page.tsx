import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";
import { PathView } from "@/components/feed/path-view";
import { isDatabaseConfigured } from "@/platform/env";

export const metadata = { title: "Path" };

export default async function PathPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <PageHeader eyebrow="Path" title="Your next step" />
        <ErrorState
          title="This is unavailable"
          body="This instance has no service configured, so there is nothing to recommend."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Path"
        title="Your next step"
        description="One thing to do next, and the reason it was chosen."
      />
      <PathView />
    </>
  );
}
