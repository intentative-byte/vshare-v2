import { NextResponse } from "next/server";
import { getEnv, isDatabaseConfigured } from "@/platform/env";
import { logger } from "@/platform/logger";

export const dynamic = "force-dynamic";

/**
 * Readiness. Reports whether this instance can serve its dependencies, and
 * nothing else: no variable names, no hostnames, no versions. A failure says
 * "not ready" to the caller and the reason goes to the logs only
 * (docs/VSHARES_PR_DISPOSITION.md, PR #4).
 *
 * From Milestone 2 the account system needs a database, so an instance
 * without one is not ready to serve.
 */
export function GET() {
  try {
    getEnv();

    if (!isDatabaseConfigured()) {
      logger.warn({ event: "readiness_not_configured", outcome: "database_missing" });
      return NextResponse.json(
        { status: "not_ready" },
        { status: 503, headers: { "cache-control": "no-store" } },
      );
    }

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
