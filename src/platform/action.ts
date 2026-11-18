import type { ZodType } from "zod";
import { failWithDefault, ok, type ErrorCode, type Result } from "@/platform/result";
import { logger, newRequestId, userRef } from "@/platform/logger";
import { checkRateLimit, type RateLimitRule, type RateLimitStore } from "@/platform/rate-limit";
import type { Role, Viewer } from "@/platform/auth/types";

/**
 * The one pipeline every mutation goes through, so no step can be forgotten:
 *
 *   rate limit -> authenticate -> validate -> authorise -> execute -> record -> respond
 *
 * docs/VSHARES_ARCHITECTURE.md section 4.
 */

export type Access =
  | "public" // no session required
  | "viewer" // any account, including a guest
  | "account" // a registered (non-guest) account
  | Role; // moderator or admin

export type ActionContext = {
  requestId: string;
  viewer: Viewer | null;
};

export type ActionDefinition<Input, Output> = {
  /** Stable name used for logs, rate-limit buckets and audit entries. */
  name: string;
  access: Access;
  input: ZodType<Input>;
  rateLimit?: RateLimitRule;
  handler: (input: Input, context: ActionContext) => Promise<Result<Output>>;
};

/**
 * How the pipeline learns who is calling. The authentication adapter
 * registers itself here in Milestone 2; until then nothing is authenticated
 * and actions that require an account correctly refuse.
 */
type ViewerResolver = () => Promise<Viewer | null>;

/**
 * The default resolver loads the authentication adapter on first use. The
 * import is deferred so that unit tests, which register their own resolver,
 * never pull server-only code into a plain Node environment.
 */
let resolveViewer: ViewerResolver = async () => {
  const { getViewer } = await import("@/platform/auth/provider");
  return getViewer();
};

export function setViewerResolver(resolver: ViewerResolver): void {
  resolveViewer = resolver;
}

/** Identifies the caller for rate limiting: the account, else the client hint. */
export type CallerHint = {
  /** Hashed network identifier for unauthenticated callers. */
  clientRef?: string;
};

export type ActionDependencies = {
  rateLimitStore?: RateLimitStore;
  nowMs?: number;
};

function meetsAccess(access: Access, viewer: Viewer | null): ErrorCode | null {
  if (access === "public") {
    return null;
  }

  if (!viewer) {
    return "UNAUTHENTICATED";
  }

  if (access === "viewer") {
    return null;
  }

  if (access === "account") {
    return viewer.isGuest ? "FORBIDDEN" : null;
  }

  if (viewer.isGuest || !viewer.roles.includes(access)) {
    return "FORBIDDEN";
  }

  return null;
}

export function defineAction<Input, Output>(definition: ActionDefinition<Input, Output>) {
  return async function run(
    rawInput: unknown,
    hint: CallerHint = {},
    dependencies: ActionDependencies = {},
  ): Promise<Result<Output>> {
    const requestId = newRequestId();
    const startedAt = Date.now();
    const base = { event: "action", route: definition.name, requestId };

    try {
      const viewer = await resolveViewer();
      const subject = viewer?.userId ?? hint.clientRef ?? "anonymous";

      // 1. Rate limit.
      if (definition.rateLimit) {
        const decision = await checkRateLimit(definition.name, subject, definition.rateLimit, {
          store: dependencies.rateLimitStore,
          nowMs: dependencies.nowMs,
        });

        if (!decision.allowed) {
          logger.warn({ ...base, outcome: "rate_limited" });
          return failWithDefault("RATE_LIMITED", { retryAfterSeconds: decision.retryAfterSeconds });
        }
      }

      // 2 and 4. Authenticate and authorise. Validation sits between them so a
      // caller without access learns nothing about the expected input shape.
      const accessFailure = meetsAccess(definition.access, viewer);

      if (accessFailure) {
        logger.warn({ ...base, outcome: "denied", code: accessFailure });
        return failWithDefault(accessFailure);
      }

      // 3. Validate.
      const parsed = definition.input.safeParse(rawInput);

      if (!parsed.success) {
        const fields: Record<string, string> = {};

        for (const issue of parsed.error.issues) {
          const key = issue.path.join(".") || "_";
          fields[key] ??= issue.message;
        }

        logger.info({ ...base, outcome: "invalid" });
        return failWithDefault("VALIDATION", { fields });
      }

      // 5. Execute.
      const context: ActionContext = { requestId, viewer };
      const result = await definition.handler(parsed.data, context);

      // 6 and 7. Record and respond.
      logger.info({
        ...base,
        ...(viewer ? { userRef: userRef(viewer.userId) } : {}),
        outcome: result.ok ? "ok" : "error",
        ...(result.ok ? {} : { code: result.error.code }),
        durationMs: Date.now() - startedAt,
      });

      return result;
    } catch (error) {
      // Internal detail is logged, never returned.
      logger.error({
        ...base,
        outcome: "exception",
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : "unknown error",
      });

      return failWithDefault("UNAVAILABLE");
    }
  };
}

export { ok };
