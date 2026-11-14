/**
 * Profiles module — identity and account lifecycle.
 *
 * Owns the profile record, role reads, guest upgrade, data export and
 * account deletion. Depends on the platform auth and database interfaces
 * only, never on a vendor SDK.
 *
 * Implemented so far: nothing. Milestone 1 builds the foundation only.
 *
 * Planned public API (docs/VSHARES_API_CONTRACTS.md section 3):
 *   getMyProfile()                 Milestone 2
 *   updateProfile(input)           Milestone 2
 *   setAvatar(file)                Milestone 2
 *   requestMagicLink(input)        Milestone 2
 *   startGoogleSignIn(input)       Milestone 2
 *   signOut(input)                 Milestone 2
 *   requestEmailChange(input)      Milestone 6
 *   exportMyData()                 Milestone 6
 *   deleteAccount(input)           Milestone 6
 *
 * Reserved for later releases: public profiles and follows.
 */
export {};
