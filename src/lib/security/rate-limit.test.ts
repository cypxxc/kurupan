import { describe, expect, it } from "vitest";

import { InMemoryRateLimiter } from "@/lib/security/rate-limit";

describe("InMemoryRateLimiter", () => {
  it("blocks requests after the configured limit", () => {
    const limiter = new InMemoryRateLimiter(() => 1_000);

    expect(limiter.consume("login:ip", { limit: 2, windowMs: 60_000 }).allowed).toBe(true);
    expect(limiter.consume("login:ip", { limit: 2, windowMs: 60_000 }).allowed).toBe(true);
    expect(limiter.consume("login:ip", { limit: 2, windowMs: 60_000 }).allowed).toBe(false);
  });

  it("resets counts when the window expires", () => {
    let now = 1_000;
    const limiter = new InMemoryRateLimiter(() => now);

    limiter.consume("login:ip", { limit: 1, windowMs: 1_000 });
    expect(limiter.consume("login:ip", { limit: 1, windowMs: 1_000 }).allowed).toBe(false);

    now = 2_001;

    expect(limiter.consume("login:ip", { limit: 1, windowMs: 1_000 }).allowed).toBe(true);
  });
});
