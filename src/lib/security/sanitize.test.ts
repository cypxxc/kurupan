import { describe, expect, it } from "vitest";

import { sanitizeSensitiveData } from "@/lib/security/sanitize";

describe("sanitizeSensitiveData", () => {
  it("redacts nested sensitive fields", () => {
    expect(
      sanitizeSensitiveData({
        username: "admin",
        passwordHash: "secret-hash",
        profile: {
          token: "secret-token",
        },
      }),
    ).toEqual({
      username: "admin",
      passwordHash: "[REDACTED]",
      profile: {
        token: "[REDACTED]",
      },
    });
  });
});
