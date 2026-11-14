import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";
import { MySubmissions } from "@/components/submissions/my-submissions";
import { isDatabaseConfigured } from "@/platform/env";

export const metadata = { title: "My submissions" };

export default function SubmissionsPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <PageHeader eyebrow="You" title="My submissions" />
        <ErrorState title="This is unavailable" body="No service is configured." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="You"
        title="My submissions"
        description="What you have recommended, and where each one has got to."
      />
      <MySubmissions />
    </>
  );
}
