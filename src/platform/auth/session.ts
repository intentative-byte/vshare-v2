import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getEnv, isDatabaseConfigured } from "@/platform/env";

/**
 * Keeps the session cookie fresh.
 *
 * The cookie pair the auth service issues is short-lived. Touching the
 * session on each request rotates it before it expires, so a long visit does
 * not end abruptly. This is the only place outside the database clients that
 * knows which auth vendor is in use (decision D-027).
 */
export async function refreshSessionCookies(
  request: NextRequest,
  response: NextResponse,
  rebuildResponse: () => NextResponse,
): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return response;
  }

  const env = getEnv();
  let current = response;

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL as string,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          current = rebuildResponse();

          for (const { name, value, options } of cookiesToSet) {
            current.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Verifies the token with the auth service and rotates the cookies when
  // they are near expiry. The result is deliberately unused: authorisation
  // happens in the action pipeline and in the database, never here.
  await supabase.auth.getUser();

  return current;
}
