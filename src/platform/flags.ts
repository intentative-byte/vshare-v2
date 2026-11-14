/**
 * Feature flags.
 *
 * Every capability that is unfinished or carries risk sits behind a flag, so
 * it can be switched off without a deploy. The values move to the
 * `feature_flags` table (docs/VSHARES_DATA_MODEL.md) when the database
 * arrives in Milestone 2; callers keep the same function.
 */

export const featureFlags = {
  /** Account creation and sign-in. Implemented in Milestone 2. */
  authentication: false,
  /** Catalogue reads from the database. Implemented in Milestone 3. */
  catalogue: false,
  /** Ranked feed sessions. Implemented in Milestone 4. */
  valueFeed: false,
  /** Saved library and progress. Implemented in Milestone 5. */
  library: false,
  /** Resource submission. Implemented in Milestone 6. */
  submissions: false,
  /** Event collection. Implemented in Milestone 7. */
  analytics: false,
} as const;

export type FeatureFlag = keyof typeof featureFlags;

export function isEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}
