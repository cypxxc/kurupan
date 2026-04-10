import { describe, expect, it } from "vitest";

import {
  getRestockItemsForCancellation,
  resolveApprovalStatus,
  shouldNotifyBorrowerOfCancellation,
} from "@/modules/borrow/services/borrow-request-service.helpers";

describe("resolveApprovalStatus", () => {
  it("returns approved when every item is approved in full", () => {
    expect(
      resolveApprovalStatus([
        { requestedQty: 2, approvedQty: 2 },
        { requestedQty: 1, approvedQty: 1 },
      ]),
    ).toBe("approved");
  });

  it("returns partially approved when some items are reduced or skipped", () => {
    expect(
      resolveApprovalStatus([
        { requestedQty: 2, approvedQty: 2 },
        { requestedQty: 3, approvedQty: 1 },
        { requestedQty: 1, approvedQty: 0 },
      ]),
    ).toBe("partially_approved");
  });

  it("rejects approvals that leave every item at zero", () => {
    expect(() =>
      resolveApprovalStatus([
        { requestedQty: 2, approvedQty: 0 },
        { requestedQty: 1, approvedQty: 0 },
      ]),
    ).toThrow("Approve at least one item");
  });
});

describe("getRestockItemsForCancellation", () => {
  it("returns approved quantities for approved requests", () => {
    expect(
      getRestockItemsForCancellation({
        status: "approved",
        items: [
          { assetId: 1, approvedQty: 2 },
          { assetId: 2, approvedQty: 0 },
          { assetId: 3, approvedQty: null },
        ] as never,
      }),
    ).toEqual([{ assetId: 1, qty: 2 }]);
  });

  it("skips restock for pending requests", () => {
    expect(
      getRestockItemsForCancellation({
        status: "pending",
        items: [{ assetId: 1, approvedQty: 2 }] as never,
      }),
    ).toEqual([]);
  });
});

describe("shouldNotifyBorrowerOfCancellation", () => {
  it("notifies the borrower when staff cancels an approved request", () => {
    expect(
      shouldNotifyBorrowerOfCancellation("approved", "staff01", "borrower01"),
    ).toBe(true);
  });

  it("skips borrower notification for self-cancelled requests", () => {
    expect(
      shouldNotifyBorrowerOfCancellation("approved", "borrower01", "borrower01"),
    ).toBe(false);
  });

  it("skips borrower notification for non-approved requests", () => {
    expect(
      shouldNotifyBorrowerOfCancellation("pending", "staff01", "borrower01"),
    ).toBe(false);
  });
});
