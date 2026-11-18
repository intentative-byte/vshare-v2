import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requireDatabaseEnv, requireServiceRoleKey } from "@/platform/env";

/**
 * Database clients. The only place in the codebase that constructs a vendor
 * client; module repositories receive one of these.
 *
 * Generated table types replace the loose typing here when the first
 * migration with tables lands in Milestone 2.
 * docs/VSHARES_ARCHITECTURE.md section 4.
 */

/**
 * Acts as the signed-in or guest viewer. Row-level security applies to every
 * statement. Used for all user-scoped reads and writes.
 */
export async function createRequestClient() {
  const { url, anonKey } = requireDatabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components cannot always write cookies; the proxy refreshes
          // the session on the next request.
        }
      },
    },
  });
}

/**
 * Anonymous reader for public pages. Carries no user identity, so it sees
 * only what policies expose to everyone.
 */
export function createPublicClient() {
  const { url, anonKey } = requireDatabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // A public client never establishes a session.
      },
    },
  });
}

/**
 * Bypasses row-level security. Permitted only inside named privileged
 * operations that perform their own authorisation check — account deletion,
 * export assembly, scheduled jobs and role grants. Never used to serve a page.
 */
export function createPrivilegedClient() {
  const { url } = requireDatabaseEnv();
  const serviceRoleKey = requireServiceRoleKey();

  return createServerClient(url, serviceRoleKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // No session: this client is not tied to a viewer.
      },
    },
  });
}
