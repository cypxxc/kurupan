import { describe, expect, it } from "vitest";

import { ValidationError } from "@/lib/errors";
import { buildDepreciationSchedule, calculateDepreciation } from "@/lib/depreciation";

describe("depreciation", () => {
  it("rejects useful life values less than or equal to zero", () => {
    expect(() =>
      calculateDepreciation({
        purchasePrice: 1000,
        purchaseDate: "2026-01-01",
        usefulLifeYears: 0,
        residualValue: 1,
      }),
    ).toThrowError(ValidationError);
  });

  it("rejects residual value greater than purchase price", () => {
    expect(() =>
      buildDepreciationSchedule({
        purchasePrice: 1000,
        purchaseDate: "2026-01-01",
        usefulLifeYears: 5,
        residualValue: 1001,
      }),
    ).toThrowError(ValidationError);
  });
});
