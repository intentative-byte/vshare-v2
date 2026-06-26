export const DEMO_MODE_COOKIE = "vshare_demo_mode";

export function isDemoModeEnabled(cookieValue: string | undefined): boolean {
  return cookieValue === "1";
}
