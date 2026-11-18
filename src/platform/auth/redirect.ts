/**
 * Post-authentication redirect targets.
 *
 * Only same-site absolute paths are accepted. Anything else — an absolute
 * URL, a protocol-relative URL, a backslash form that some browsers
 * normalise to a host, or a control character — falls back to the default.
 * docs/VSHARES_SECURITY.md T5.
 */

export const defaultRedirectPath = "/learn";

export function safeNextPath(value: string | null | undefined, fallback = defaultRedirectPath): string {
  if (typeof value !== "string" || value === "") {
    return fallback;
  }

  // Must be a single-slash absolute path.
  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  // Backslashes, control characters and encoded forms of either are rejected
  // rather than normalised.
  if (/[\\\u0000-\u001f\u007f]/.test(value) || /%5c/i.test(value) || /%0[9ad]/i.test(value)) {
    return fallback;
  }

  // A path may not carry its own scheme or authority.
  if (value.includes("://")) {
    return fallback;
  }

  return value;
}
