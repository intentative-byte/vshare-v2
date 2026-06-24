import { AppShell } from "@/components/AppShell";
import { ExploreExperience } from "@/components/ExploreExperience";

export default function ExplorePage() {
  return (
    <AppShell active="explore">
      <ExploreExperience />
    </AppShell>
  );
}
