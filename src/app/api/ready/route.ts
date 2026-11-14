import { NextResponse } from "next/server";
import { getEnv } from "@/platform/env";
import { logger } from "@/platform/logger";

export const dynamic = "force-dynamic";

/**
 * Readiness. Reports whether this instance can serve its dependencies, and
 * nothing else: no variable names, no hostnames, no versions. A failure says
 * "not ready" to the caller and the reason goes to the logs only
 * (docs/VSHARES_PR_DISPOSITION.md, PR #4).
 *
 * The database check lands with the first migration in Milestone 2. Until
 * then readiness is configuration validity.
 */
export function GET() {
  try {
    getEnv();
    return NextResponse.json({ status: "ready" }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logger.error({
      event: "readiness_failed",
      message: error instanceof Error ? error.message : "unknown error",
    });

    return NextResponse.json(
      { status: "not_ready" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
