/**
 * Profiles module — identity and account lifecycle.
 *
 * Owns the profile record, role reads and the guest-to-account path.
 * Depends on the platform auth and database interfaces only, never on a
 * vendor SDK.
 *
 * Implemented: sign-in by magic link, provider sign-in, guest accounts,
 * guest upgrade with collision handling, sign-out including everywhere,
 * profile read and partial update.
 *
 * Planned: avatar upload and email change (Milestone 6), data export and
 * account deletion (Milestone 6), public profiles and follows (later).
 */

export {
  requestMagicLink,
  startProviderSignIn,
  signOut,
  ensureGuest,
  upgradeGuest,
  recordGuestCollision,
  getMyProfile,
  updateProfile,
  readViewer,
  readMyProfile,
} from "./actions";

export {
  handleSchema,
  displayNameSchema,
  updateProfileInput,
  signInInput,
  type UpdateProfileInput,
} from "./schemas";

export type { Profile } from "./types";
