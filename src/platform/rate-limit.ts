/**
 * Rate limiting.
 *
 * The decision function is pure so it can be tested without a clock or a
 * store. The store is an interface: an in-process map today, a Postgres table
 * from Milestone 2 (decision D-017), swappable without touching callers.
 * docs/VSHARES_ARCHITECTURE.md section 4.
 */

export type RateLimitRule = {
  /** Maximum number of permitted attempts inside one window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  windowStart: number;
};

export type RateLimitCounter = {
  windowStart: number;
  count: number;
};

export type RateLimitStore = {
  /** Increments the counter for a key and window, returning the new value. */
  increment(key: string, windowStart: number, windowSeconds: number): Promise<RateLimitCounter>;
};

/** Start of the fixed window containing `nowMs`, in whole seconds. */
export function windowStartFor(nowMs: number, windowSeconds: number): number {
  const nowSeconds = Math.floor(nowMs / 1000);
  return nowSeconds - (nowSeconds % windowSeconds);
}

export function decide(
  counter: RateLimitCounter,
  rule: RateLimitRule,
  nowMs: number,
): RateLimitDecision {
  const windowEnd = counter.windowStart + rule.windowSeconds;
  const retryAfterSeconds = Math.max(1, windowEnd - Math.floor(nowMs / 1000));
  const allowed = counter.count <= rule.limit;

  return {
    allowed,
    remaining: Math.max(0, rule.limit - counter.count),
    retryAfterSeconds: allowed ? 0 : retryAfterSeconds,
    windowStart: counter.windowStart,
  };
}

/**
 * In-process store. Correct for local development, tests and a single server
 * process; replaced by the shared Postgres store before any deployment that
 * runs more than one instance.
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly counters = new Map<string, RateLimitCounter>();

  async increment(key: string, windowStart: number): Promise<RateLimitCounter> {
    const existing = this.counters.get(key);

    if (!existing || existing.windowStart !== windowStart) {
      const fresh = { windowStart, count: 1 };
      this.counters.set(key, fresh);
      return fresh;
    }

    existing.count += 1;
    return existing;
  }

  clear(): void {
    this.counters.clear();
  }
}

const defaultStore = new MemoryRateLimitStore();

export async function checkRateLimit(
  bucket: string,
  subject: string,
  rule: RateLimitRule,
  options: { store?: RateLimitStore; nowMs?: number } = {},
): Promise<RateLimitDecision> {
  const store = options.store ?? defaultStore;
  const nowMs = options.nowMs ?? Date.now();
  const windowStart = windowStartFor(nowMs, rule.windowSeconds);
  const counter = await store.increment(`${bucket}:${subject}`, windowStart, rule.windowSeconds);

  return decide(counter, rule, nowMs);
}

/** Named rules, so limits are visible in one place rather than scattered. */
export const rateLimitRules = {
  magicLinkPerEmail: { limit: 3, windowSeconds: 15 * 60 },
  magicLinkPerIp: { limit: 10, windowSeconds: 60 * 60 },
  guestSignInPerIp: { limit: 10, windowSeconds: 60 * 60 },
  interactionPerUser: { limit: 120, windowSeconds: 60 * 60 },
  submissionPerUser: { limit: 5, windowSeconds: 24 * 60 * 60 },
  reportPerUser: { limit: 10, windowSeconds: 24 * 60 * 60 },
  exportPerUser: { limit: 3, windowSeconds: 24 * 60 * 60 },
  eventsPerSession: { limit: 240, windowSeconds: 60 * 60 },
  // Staff catalogue writes. Generous, because a reviewer clearing a backlog
  // is legitimate; it exists to bound a compromised or runaway staff account,
  // not to pace ordinary work.
  staffWritePerUser: { limit: 300, windowSeconds: 60 * 60 },
} as const satisfies Record<string, RateLimitRule>;
