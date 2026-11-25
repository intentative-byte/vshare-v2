import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";
import { DataRights } from "@/components/account/data-rights";
import { isDatabaseConfigured } from "@/platform/env";

export const metadata = { title: "Your data" };

export default function DataPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <PageHeader eyebrow="You" title="Your data" />
        <ErrorState title="This is unavailable" body="No service is configured." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="You"
        title="Your data"
        description="Take a copy of everything we hold about you, or delete your account."
      />
      <DataRights />
    </>
  );
}
