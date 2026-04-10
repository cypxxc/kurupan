import { ValidationError } from "@/lib/errors";

export type DepreciationInput = {
  purchasePrice: number;
  purchaseDate: string;
  usefulLifeYears: number;
  residualValue: number;
  asOfDate?: string;
};

export type DepreciationResult = {
  annualDepreciation: number;
  elapsedYears: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  isFullyDepreciated: boolean;
};

export type DepreciationScheduleRow = {
  year: number;
  annualDepreciation: number;
  accumulatedDepreciation: number;
  netBookValue: number;
};

function roundToTwo(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toUtcDate(dateString: string) {
  return new Date(`${dateString}T00:00:00Z`);
}

function assertDepreciationInput(
  purchasePrice: number,
  usefulLifeYears: number,
  residualValue: number,
) {
  if (usefulLifeYears <= 0) {
    throw new ValidationError("Useful life years must be greater than zero", {
      usefulLifeYears,
    });
  }

  if (residualValue > purchasePrice) {
    throw new ValidationError("Residual value must not exceed purchase price", {
      purchasePrice,
      residualValue,
    });
  }
}

function getYearlyAmounts(
  purchasePrice: number,
  usefulLifeYears: number,
  residualValue: number,
) {
  assertDepreciationInput(purchasePrice, usefulLifeYears, residualValue);
  const depreciableBase = purchasePrice - residualValue;
  const standardAnnual = roundToTwo(depreciableBase / usefulLifeYears);

  return Array.from({ length: usefulLifeYears }, (_, index) => {
    if (index === usefulLifeYears - 1) {
      const allocated = standardAnnual * (usefulLifeYears - 1);
      return roundToTwo(depreciableBase - allocated);
    }

    return standardAnnual;
  });
}

export function calculateDepreciation(input: DepreciationInput): DepreciationResult {
  const asOfDate = input.asOfDate ?? new Date().toISOString().slice(0, 10);
  const purchaseDate = toUtcDate(input.purchaseDate);
  const comparisonDate = toUtcDate(asOfDate);
  const millisecondsDiff = Math.max(0, comparisonDate.getTime() - purchaseDate.getTime());
  const daysDiff = millisecondsDiff / (1000 * 60 * 60 * 24);
  const elapsedYears = Math.min(
    Math.floor(daysDiff / 365.25),
    input.usefulLifeYears,
  );
  const yearlyAmounts = getYearlyAmounts(
    input.purchasePrice,
    input.usefulLifeYears,
    input.residualValue,
  );
  const accumulatedDepreciation = roundToTwo(
    yearlyAmounts.slice(0, elapsedYears).reduce((sum, value) => sum + value, 0),
  );
  const netBookValue = roundToTwo(input.purchasePrice - accumulatedDepreciation);

  return {
    annualDepreciation: yearlyAmounts[0] ?? 0,
    elapsedYears,
    accumulatedDepreciation,
    netBookValue,
    isFullyDepreciated: elapsedYears >= input.usefulLifeYears,
  };
}

export function buildDepreciationSchedule(
  input: Omit<DepreciationInput, "asOfDate">,
): DepreciationScheduleRow[] {
  const yearlyAmounts = getYearlyAmounts(
    input.purchasePrice,
    input.usefulLifeYears,
    input.residualValue,
  );
  let accumulatedDepreciation = 0;

  return yearlyAmounts.map((annualDepreciation, index) => {
    accumulatedDepreciation = roundToTwo(accumulatedDepreciation + annualDepreciation);
    const netBookValue = roundToTwo(input.purchasePrice - accumulatedDepreciation);

    return {
      year: index + 1,
      annualDepreciation,
      accumulatedDepreciation,
      netBookValue,
    };
  });
}
