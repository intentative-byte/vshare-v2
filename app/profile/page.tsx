import { AppShell } from "@/components/AppShell";
import { ProfileDashboard } from "@/components/ProfileDashboard";

export default function ProfilePage() {
  return (
    <AppShell active="profile">
      <ProfileDashboard />
    </AppShell>
  );
}
