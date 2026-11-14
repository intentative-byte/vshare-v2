import { type NextRequest, NextResponse } from "next/server";

/**
 * Per-request Content-Security-Policy with a nonce.
 *
 * The nonce is placed on the request headers so the framework applies it to
 * its own inline bootstrap scripts, and on the response headers so the
 * browser enforces it. No 'unsafe-inline' is allowed for scripts.
 *
 * Style still needs 'unsafe-inline': the framework injects inline <style>
 * elements for the compiled stylesheet in development and for critical CSS in
 * production, and they are not nonced. This is a documented exception
 * (docs/VSHARES_SECURITY.md T7).
 *
 * Route protection lands in Milestone 2; this file only sets headers today.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDevelopment = process.env.NODE_ENV !== "production";

  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDevelopment ? "'unsafe-eval'" : ""}`.trim(),
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

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", policy);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
