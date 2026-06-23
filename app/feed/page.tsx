import { AppShell } from "@/components/layout/app-shell";
import { FeedClient } from "@/components/feed/feed-client";

export default function FeedPage() {
  return (
    <AppShell>
      <FeedClient />
    </AppShell>
  );
}
