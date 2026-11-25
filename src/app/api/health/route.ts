import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Liveness. Answers only whether this process is serving requests, with no
 * dependency checks and no configuration detail.
 */
export function GET() {
  return NextResponse.json(
    { status: "ok" },
    { headers: { "cache-control": "no-store" } },
  );
}
