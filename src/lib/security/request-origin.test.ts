import { describe, expect, it } from "vitest";

import { assertTrustedMutationRequest } from "@/lib/security/request-origin";

describe("assertTrustedMutationRequest", () => {
  it("allows safe methods without origin headers", () => {
    const request = new Request("https://app.example.test/api/assets", {
      method: "GET",
    });

    expect(() => assertTrustedMutationRequest(request)).not.toThrow();
  });

  it("allows same-origin mutation requests", () => {
    const request = new Request("https://app.example.test/api/assets", {
      method: "POST",
      headers: {
        Origin: "https://app.example.test",
      },
    });

    expect(() => assertTrustedMutationRequest(request)).not.toThrow();
  });

  it("blocks cross-origin mutation requests", () => {
    const request = new Request("https://app.example.test/api/assets", {
      method: "PATCH",
      headers: {
        Origin: "https://evil.example.test",
      },
    });

    expect(() => assertTrustedMutationRequest(request)).toThrow(
      "Cross-site request blocked",
    );
  });

  it("allows referer fallback when origin is absent", () => {
    const request = new Request("https://app.example.test/api/assets", {
      method: "DELETE",
      headers: {
        Referer: "https://app.example.test/assets/1",
      },
    });

    expect(() => assertTrustedMutationRequest(request)).not.toThrow();
  });
});
