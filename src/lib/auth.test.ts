import { describe, expect, it } from "vitest";

import { validateSessionConfig } from "@/lib/auth";

describe("validateSessionConfig", () => {
  it("rejects missing secrets", () => {
    expect(() => validateSessionConfig({})).toThrow("SESSION_SECRET is not set");
  });

  it("rejects default placeholder secrets", () => {
    expect(() =>
      validateSessionConfig({
        SESSION_SECRET: "change-me-to-random-64-char-hex",
      }),
    ).toThrow("SESSION_SECRET must be at least 32 characters");
  });

  it("accepts a strong secret and positive ttl", () => {
    expect(() =>
      validateSessionConfig({
        SESSION_SECRET: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        SESSION_TTL_HOURS: "8",
      }),
    ).not.toThrow();
  });
});
