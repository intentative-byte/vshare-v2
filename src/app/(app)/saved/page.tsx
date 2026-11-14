import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { FoundationNotice } from "@/components/ui/foundation-notice";

export const metadata = { title: "Saved" };

export default function SavedPage() {
  return (
    <>
      <PageHeader
        eyebrow="Saved"
        title="Your knowledge library"
        description="What you saved, and what you have finished."
      />

      <EmptyState
        title="Nothing saved yet"
        body="When you save something from your feed it will appear here, alongside everything you have completed."
        action={{ href: "/learn", label: "Go to Learn" }}
      />

      <FoundationNotice
        className="mt-4"
        milestone="Milestone 5"
        summary="Saving, the completed history and review reminders are built once the feed and progress tracking are in place."
      />
    </>
  );
}
