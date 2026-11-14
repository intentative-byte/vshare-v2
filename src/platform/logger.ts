/**
 * Structured logging.
 *
 * Logs carry identifiers and outcomes, never personal data: no email
 * addresses, no profile fields, no content bodies. User identity is recorded
 * as a short non-reversible digest so entries can be correlated without
 * holding an account identifier in logs.
 * docs/VSHARES_SECURITY.md T11.
 */

import { createHash } from "node:crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = {
  event: string;
  requestId?: string;
  userRef?: string;
  route?: string;
  durationMs?: number;
  outcome?: string;
  code?: string;
  [key: string]: string | number | boolean | undefined;
};

const levelOrder: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function minimumLevel(): LogLevel {
  const configured = process.env.LOG_LEVEL as LogLevel | undefined;
  if (configured && configured in levelOrder) {
    return configured;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

/** Short digest of a user id. Not reversible; stable within a deployment. */
export function userRef(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 12);
}

function emit(level: LogLevel, fields: LogFields): void {
  if (levelOrder[level] < levelOrder[minimumLevel()]) {
    return;
  }

  const line = JSON.stringify({ level, time: new Date().toISOString(), ...fields });

  if (level === "error" || level === "warn") {
    console.error(line);
    return;
  }

  console.log(line);
}

export const logger = {
  debug: (fields: LogFields) => emit("debug", fields),
  info: (fields: LogFields) => emit("info", fields),
  warn: (fields: LogFields) => emit("warn", fields),
  error: (fields: LogFields) => emit("error", fields),
};

export function newRequestId(): string {
  return crypto.randomUUID();
}
