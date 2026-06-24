import { AppShell } from "@/components/AppShell";
import { FeedExperience } from "@/components/FeedExperience";

export default function FeedPage() {
  return (
    <AppShell active="feed">
      <FeedExperience />
    </AppShell>
  );
}
