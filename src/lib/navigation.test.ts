import { describe, expect, it } from "vitest";

import { sanitizeInternalNextPath } from "@/lib/navigation";

describe("sanitizeInternalNextPath", () => {
  it("allows normal in-app paths", () => {
    expect(sanitizeInternalNextPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeInternalNextPath("/borrow-requests/new?assetId=1")).toBe(
      "/borrow-requests/new?assetId=1",
    );
  });

  it("falls back for empty or missing paths", () => {
    expect(sanitizeInternalNextPath("")).toBe("/dashboard");
    expect(sanitizeInternalNextPath(undefined)).toBe("/dashboard");
    expect(sanitizeInternalNextPath(null)).toBe("/dashboard");
  });

  it("blocks protocol-relative and malformed redirect targets", () => {
    expect(sanitizeInternalNextPath("//evil.example")).toBe("/dashboard");
    expect(sanitizeInternalNextPath("https://evil.example")).toBe("/dashboard");
    expect(sanitizeInternalNextPath("/\\evil.example")).toBe("/dashboard");
  });
});
