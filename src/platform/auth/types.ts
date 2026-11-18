/**
 * The authentication boundary.
 *
 * Feature modules depend on these types only, never on the auth vendor's SDK,
 * so the provider can be replaced by writing one adapter (decision D-027,
 * docs/VSHARES_ARCHITECTURE.md section 9).
 *
 * The adapter itself is implemented in Milestone 2. Nothing in Milestone 1
 * authenticates anybody, and no stub pretends to.
 */

export type Role = "moderator" | "admin";

export type Viewer = {
  userId: string;
  /** True for an anonymous (guest) account that has not been upgraded. */
  isGuest: boolean;
  roles: Role[];
};

export type AuthProvider = {
  /** The current viewer, verified server-side, or null when signed out. */
  getViewer(): Promise<Viewer | null>;
  /** Sends a magic link. Returns the same result whether or not the address is known. */
  signInWithEmail(email: string, nextPath: string): Promise<void>;
  /** Starts an OAuth flow and returns the provider URL to redirect to. */
  signInWithProvider(provider: "google", nextPath: string): Promise<{ url: string }>;
  /** Creates an anonymous account for a visitor who is about to write something. */
  ensureGuest(): Promise<Viewer>;
  /** Links a verified identity to the current guest account, keeping its data. */
  upgradeGuest(): Promise<Viewer>;
  signOut(options?: { everywhere?: boolean }): Promise<void>;
};
