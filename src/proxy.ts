import { type NextRequest, NextResponse } from "next/server";
import { refreshSessionCookies } from "@/platform/auth/session";

/**
 * Runs before every page request. Two jobs:
 *
 *  1. Set a Content-Security-Policy carrying a per-request nonce, so no
 *     inline script runs without one.
 *  2. Keep the session cookie fresh.
 *
 * It is NOT a security boundary. Every action authenticates and authorises
 * again on the server, and the database enforces the same rules a third
 * time. Nothing here decides who may do what
 * (docs/VSHARES_SECURITY.md T1).
 */

function contentSecurityPolicy(nonce: string, isDevelopment: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDevelopment ? "'unsafe-eval'" : ""}`.trim(),
    // Style still needs 'unsafe-inline': the framework injects un-nonced
    // inline styles. Documented exception, docs/VSHARES_SECURITY.md T7.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV !== "production");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", policy);

  const build = () => {
    const next = NextResponse.next({ request: { headers: requestHeaders } });
    next.headers.set("content-security-policy", policy);
    return next;
  };

  return refreshSessionCookies(request, build(), build);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
