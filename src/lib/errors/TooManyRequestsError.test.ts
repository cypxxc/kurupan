import { describe, expect, it } from "vitest";

import { TooManyRequestsError } from "@/lib/errors";

describe("TooManyRequestsError", () => {
  it("uses HTTP 429 and exposes retry-after headers when provided", () => {
    const error = new TooManyRequestsError("Rate limited", {
      retryAfterSeconds: 60,
    });

    expect(error.code).toBe("TOO_MANY_REQUESTS");
    expect(error.statusCode).toBe(429);
    expect(error.headers).toEqual({
      "Retry-After": "60",
    });
    expect(error.details).toEqual({
      retryAfterSeconds: 60,
    });
  });

  it("keeps details optional for generic throttling", () => {
    const error = new TooManyRequestsError();

    expect(error.headers).toBeUndefined();
    expect(error.details).toBeUndefined();
  });
});
