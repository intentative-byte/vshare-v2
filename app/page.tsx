import { AppShell } from "@/components/AppShell";
import { FeedExperience } from "@/components/FeedExperience";

export default function HomePage() {
  return (
    <AppShell active="feed">
      <FeedExperience />
    </AppShell>
  );
}
