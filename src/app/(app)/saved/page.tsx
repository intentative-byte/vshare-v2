import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";
import { SavedLibrary } from "@/components/library/saved-library";
import { isDatabaseConfigured } from "@/platform/env";

export const metadata = { title: "Saved" };

export default async function SavedPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <PageHeader eyebrow="Saved" title="Your knowledge library" />
        <ErrorState
          title="Your library is unavailable"
          body="This instance has no service configured to store anything."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Saved"
        title="Your knowledge library"
        description="What you kept, and what you have finished."
      />
      <SavedLibrary />
    </>
  );
}
