import type { Profile } from "@/lib/types";

export const demoSessionKey = "vshare:demo-session";
export const demoOnboardingKey = "vshare:demo-onboarding";

export type DemoOnboarding = {
  username: string;
  headline: string | null;
  topics: string[];
  goals: string[];
  daily_minutes: number;
  updated_at: string;
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function startDemoSession() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(demoSessionKey, "true");
}

export function saveDemoOnboarding(payload: Omit<DemoOnboarding, "updated_at">) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(
    demoOnboardingKey,
    JSON.stringify({
      ...payload,
      updated_at: new Date().toISOString(),
    }),
  );
}

export function getDemoOnboarding(): DemoOnboarding | null {
  if (!isBrowser()) {
    return null;
  }

  const storedValue = window.localStorage.getItem(demoOnboardingKey);

  if (!storedValue) {
    return null;
  }

  try {
    return JSON.parse(storedValue) as DemoOnboarding;
  } catch {
    window.localStorage.removeItem(demoOnboardingKey);
    return null;
  }
}

export function profileFromDemoOnboarding(profile: Profile, onboarding: DemoOnboarding | null): Profile {
  if (!onboarding) {
    return profile;
  }

  return {
    ...profile,
    username: onboarding.username,
    full_name: onboarding.username,
    headline: onboarding.headline,
    interests: onboarding.topics,
    updated_at: onboarding.updated_at,
  };
}
