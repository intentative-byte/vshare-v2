import { AppShell } from "@/components/AppShell";
import { OnboardingForm } from "@/components/OnboardingForm";

export default function OnboardingPage() {
  return (
    <AppShell active="feed">
      <OnboardingForm />
    </AppShell>
  );
}
