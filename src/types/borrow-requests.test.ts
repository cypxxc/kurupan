import { describe, expect, it } from "vitest";

import { compareBorrowRequestsForDisplay, type BorrowRequest } from "@/types/borrow-requests";

function createRequest(
  overrides: Partial<BorrowRequest>,
): BorrowRequest {
  return {
    id: 1,
    requestNo: "BR-TEST-0001",
    borrowerExternalUserId: "user-1",
    borrowerName: "Test User",
    purpose: null,
    startDate: "2026-04-01",
    dueDate: "2026-04-08",
    status: "pending",
    createdAt: "2026-04-01T08:00:00.000Z",
    updatedAt: "2026-04-01T08:00:00.000Z",
    items: [],
    ...overrides,
  };
}

describe("compareBorrowRequestsForDisplay", () => {
  it("moves pending requests to the top before processed statuses", () => {
    const requests = [
      createRequest({
        id: 2,
        requestNo: "BR-TEST-0002",
        status: "approved",
        createdAt: "2026-04-02T08:00:00.000Z",
      }),
      createRequest({
        id: 3,
        requestNo: "BR-TEST-0003",
        status: "returned",
        createdAt: "2026-04-03T08:00:00.000Z",
      }),
      createRequest({
        id: 4,
        requestNo: "BR-TEST-0004",
        status: "pending",
        createdAt: "2026-04-04T08:00:00.000Z",
      }),
    ];

    const sorted = [...requests].sort(compareBorrowRequestsForDisplay);

    expect(sorted.map((request) => request.status)).toEqual([
      "pending",
      "approved",
      "returned",
    ]);
  });

  it("keeps newer requests first within the same status", () => {
    const requests = [
      createRequest({
        id: 10,
        requestNo: "BR-TEST-0010",
        status: "pending",
        createdAt: "2026-04-01T08:00:00.000Z",
      }),
      createRequest({
        id: 11,
        requestNo: "BR-TEST-0011",
        status: "pending",
        createdAt: "2026-04-05T08:00:00.000Z",
      }),
    ];

    const sorted = [...requests].sort(compareBorrowRequestsForDisplay);

    expect(sorted.map((request) => request.id)).toEqual([11, 10]);
  });
});
