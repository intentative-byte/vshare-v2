import { AppShell } from "@/components/AppShell";
import { SavedExperience } from "@/components/SavedExperience";

export default function SavedPage() {
  return (
    <AppShell active="saved">
      <SavedExperience />
    </AppShell>
  );
}
