import { useMemo, useSyncExternalStore } from "react";
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

function parseDemoOnboarding(storedValue: string | null): DemoOnboarding | null {
  if (!storedValue) {
    return null;
  }

  try {
    return JSON.parse(storedValue) as DemoOnboarding;
  } catch {
    return null;
  }
}

function getDemoOnboardingSnapshot() {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(demoOnboardingKey);
}

function subscribeToDemoStorage(onStoreChange: () => void) {
  if (!isBrowser()) {
    return () => {};
  }

  const handleStorageChange = () => onStoreChange();

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener("vshare:demo-storage", handleStorageChange);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener("vshare:demo-storage", handleStorageChange);
  };
}

function notifyDemoStorageChange() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event("vshare:demo-storage"));
}

export function startDemoSession() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(demoSessionKey, "true");
  notifyDemoStorageChange();
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
  notifyDemoStorageChange();
}

export function getDemoOnboarding(): DemoOnboarding | null {
  if (!isBrowser()) {
    return null;
  }

  const storedValue = window.localStorage.getItem(demoOnboardingKey);

  if (!storedValue) {
    return null;
  }

  const parsedValue = parseDemoOnboarding(storedValue);

  if (!parsedValue) {
    window.localStorage.removeItem(demoOnboardingKey);
    return null;
  }

  return parsedValue;
}

export function useDemoOnboarding() {
  const storedValue = useSyncExternalStore(subscribeToDemoStorage, getDemoOnboardingSnapshot, () => null);

  return useMemo(() => parseDemoOnboarding(storedValue), [storedValue]);
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
