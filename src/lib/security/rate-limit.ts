type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

export class InMemoryRateLimiter {
  private readonly hits = new Map<string, RateLimitState>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  consume(key: string, options: RateLimitOptions): RateLimitResult {
    const now = this.now();
    const existing = this.hits.get(key);
    const state =
      !existing || existing.resetAt <= now
        ? { count: 0, resetAt: now + options.windowMs }
        : existing;

    state.count += 1;
    this.hits.set(key, state);
    this.cleanup(now);

    const allowed = state.count <= options.limit;
    const remaining = allowed ? Math.max(options.limit - state.count, 0) : 0;

    return {
      allowed,
      limit: options.limit,
      remaining,
      resetAt: state.resetAt,
      retryAfterSeconds: Math.max(Math.ceil((state.resetAt - now) / 1000), 1),
    };
  }

  private cleanup(now: number) {
    if (this.hits.size < 1_000) {
      return;
    }

    for (const [key, value] of this.hits.entries()) {
      if (value.resetAt <= now) {
        this.hits.delete(key);
      }
    }
  }
}

const globalRateLimiter = new InMemoryRateLimiter();

export function consumeRateLimit(key: string, options: RateLimitOptions) {
  return globalRateLimiter.consume(key, options);
}

export function getRequestClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
