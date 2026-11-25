/**
 * The single result shape returned by every server action.
 * docs/VSHARES_API_CONTRACTS.md section 1.
 */

export const errorCodes = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "VALIDATION",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "UNAVAILABLE",
] as const;

export type ErrorCode = (typeof errorCodes)[number];

export type ActionError = {
  code: ErrorCode;
  /** Safe to show to a user. Never contains internal detail. */
  message: string;
  /** Per-field messages for form display. */
  fields?: Record<string, string>;
  /** Present on RATE_LIMITED. */
  retryAfterSeconds?: number;
};

export type Result<T> = { ok: true; data: T } | { ok: false; error: ActionError };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function fail<T = never>(
  code: ErrorCode,
  message: string,
  extra?: Pick<ActionError, "fields" | "retryAfterSeconds">,
): Result<T> {
  return { ok: false, error: { code, message, ...extra } };
}

/** Default user-facing wording per code, so messages stay consistent. */
export const defaultMessages: Record<ErrorCode, string> = {
  UNAUTHENTICATED: "Please sign in to continue.",
  FORBIDDEN: "You do not have access to this.",
  VALIDATION: "Please check the details and try again.",
  NOT_FOUND: "We could not find that.",
  CONFLICT: "That already exists.",
  RATE_LIMITED: "Too many attempts. Please try again shortly.",
  UNAVAILABLE: "Something went wrong at our end. Please try again.",
};

export function failWithDefault<T = never>(
  code: ErrorCode,
  extra?: Pick<ActionError, "fields" | "retryAfterSeconds">,
): Result<T> {
  return fail(code, defaultMessages[code], extra);
}
