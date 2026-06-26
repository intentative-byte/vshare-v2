import { AppShell } from "@/components/AppShell";
import { OnboardingForm } from "@/components/OnboardingForm";

export default function OnboardingPage() {
  return (
    <AppShell active="onboarding">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="rounded-[2rem] bg-ink p-6 text-white shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-violet-200">Adaptive setup</p>
          <h2 className="mt-4 text-4xl font-black tracking-tight">Tell VShare what progress looks like.</h2>
          <p className="mt-4 leading-7 text-slate-300">
            Your selected topics and goals shape what VShare recommends, who you discover, and how your daily learning
            loop evolves.
          </p>
        </aside>
        <OnboardingForm />
      </div>
    </AppShell>
  );
}
