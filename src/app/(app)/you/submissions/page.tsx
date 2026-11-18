import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";
import { MySubmissions } from "@/components/submissions/my-submissions";
import { isDatabaseConfigured } from "@/platform/env";
import { listMySubmissions } from "@/modules/content/server";

export const metadata = { title: "My submissions" };

export default async function SubmissionsPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <PageHeader eyebrow="You" title="My submissions" />
        <ErrorState title="This is unavailable" body="No service is configured." />
      </>
    );
  }

  // Read on the server, like every other read page, so loading this page issues
  // no server-action request. Row-level security scopes the query to the
  // caller, so a signed-out visitor simply gets an empty list (not an error),
  // and no one can see another person's submissions.
  const items = await listMySubmissions();

  return (
    <>
      <PageHeader
        eyebrow="You"
        title="My submissions"
        description="What you have recommended, and where each one has got to."
      />
      <MySubmissions items={items} />
    </>
  );
}
