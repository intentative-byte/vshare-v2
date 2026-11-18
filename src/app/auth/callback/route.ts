import { NextResponse, type NextRequest } from "next/server";
import { completeSignIn } from "@/platform/auth/provider";
import { safeNextPath } from "@/platform/auth/redirect";

export const dynamic = "force-dynamic";

/**
 * Completes a magic-link or provider sign-in.
 *
 * The destination is only ever a same-site path: an absolute URL, a
 * scheme-relative one or a backslash form all fall back to the default
 * (docs/VSHARES_SECURITY.md T5). A failed exchange returns to the sign-in
 * page with a code rather than a message, so nothing internal is echoed back.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in?error=callback", url.origin));
  }

  const signedIn = await completeSignIn(code);

  if (!signedIn) {
    return NextResponse.redirect(new URL("/sign-in?error=callback", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
