import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConflictError } from "@/lib/errors";
import type { BorrowRequestApproveInput } from "@/lib/validators/borrow-requests";
import type { ActorContext } from "@/types/auth";

import type { BorrowRequestDetail } from "../repositories/BorrowRequestRepository";
import { BorrowRequestService } from "./BorrowRequestService";

const { withTransactionContextMock } = vi.hoisted(() => ({
  withTransactionContextMock: vi.fn(),
}));

const { revalidateBorrowDashboardCacheMock } = vi.hoisted(() => ({
  revalidateBorrowDashboardCacheMock: vi.fn(),
}));

vi.mock("@/db/postgres", () => ({
  withTransactionContext: withTransactionContextMock,
}));

vi.mock("@/modules/dashboard/dashboard-cache", () => ({
  revalidateBorrowDashboardCache: revalidateBorrowDashboardCacheMock,
}));

function buildRequest(status: BorrowRequestDetail["status"]): BorrowRequestDetail {
  return {
    id: 1,
    requestNo: "BR-0001",
    borrowerExternalUserId: "borrower-1",
    borrowerName: "Borrower One",
    purpose: "Project work",
    startDate: "2026-04-10",
    dueDate: "2026-04-12",
    status,
    approvedByExternalUserId: null,
    approvedAt: null,
    rejectedByExternalUserId: null,
    rejectedAt: null,
    rejectionReason: null,
    cancelledByExternalUserId: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: new Date("2026-04-10T00:00:00.000Z"),
    updatedAt: new Date("2026-04-10T00:00:00.000Z"),
    items: [
      {
        id: 11,
        assetId: 101,
        assetCode: "AST-101",
        assetName: "Laptop",
        availableQty: 5,
        requestedQty: 2,
        approvedQty: null,
      },
    ],
  };
}

function createHarness() {
  const borrowRequestRepository = {
    findById: vi.fn(),
  };
  const borrowRequestPolicy = {
    assertCanApprove: vi.fn(),
  };
  const txBorrowRequestRepo = {
    findByIdForUpdate: vi.fn(),
    updateItemApprovals: vi.fn(),
    markReviewed: vi.fn(),
    findById: vi.fn(),
  };
  const txAssetRepo = {
    decrementAvailableQtyIfEnough: vi.fn(),
  };
  const txAuditService = {
    record: vi.fn(),
  };

  withTransactionContextMock.mockImplementation(
    async (callback: (ctx: unknown) => Promise<unknown>) =>
      callback({
        borrowRequestRepo: txBorrowRequestRepo,
        assetRepo: txAssetRepo,
        auditService: txAuditService,
      }),
  );

  const service = new BorrowRequestService(
    borrowRequestRepository as never,
    {} as never,
    borrowRequestPolicy as never,
    {} as never,
    undefined,
  );

  return {
    service,
    borrowRequestRepository,
    borrowRequestPolicy,
    txBorrowRequestRepo,
    txAssetRepo,
    txAuditService,
  };
}

describe("BorrowRequestService.approveBorrowRequest", () => {
  const actor: ActorContext = {
    externalUserId: "staff-1",
    role: "staff",
  };

  const input: BorrowRequestApproveInput = {
    items: [{ borrowRequestItemId: 11, approvedQty: 2 }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects already-reviewed requests before touching stock", async () => {
    const { service, borrowRequestRepository, txBorrowRequestRepo, txAssetRepo } =
      createHarness();

    txBorrowRequestRepo.findByIdForUpdate.mockResolvedValue(buildRequest("approved"));

    await expect(service.approveBorrowRequest(actor, 1, input)).rejects.toBeInstanceOf(
      ConflictError,
    );

    expect(borrowRequestRepository.findById).not.toHaveBeenCalled();
    expect(txAssetRepo.decrementAvailableQtyIfEnough).not.toHaveBeenCalled();
    expect(txBorrowRequestRepo.updateItemApprovals).not.toHaveBeenCalled();
    expect(txBorrowRequestRepo.markReviewed).not.toHaveBeenCalled();
  });

  it("uses the row-locked request snapshot inside the transaction", async () => {
    const { service, borrowRequestRepository, borrowRequestPolicy, txBorrowRequestRepo, txAssetRepo, txAuditService } =
      createHarness();
    const lockedRequest = buildRequest("pending");
    const updatedRequest = {
      ...lockedRequest,
      status: "approved" as const,
      approvedByExternalUserId: actor.externalUserId,
      approvedAt: new Date("2026-04-10T01:00:00.000Z"),
      items: [{ ...lockedRequest.items[0], approvedQty: 2 }],
    };

    txBorrowRequestRepo.findByIdForUpdate.mockResolvedValue(lockedRequest);
    txAssetRepo.decrementAvailableQtyIfEnough.mockResolvedValue({ id: 101 });
    txBorrowRequestRepo.updateItemApprovals.mockResolvedValue([{ id: 11 }]);
    txBorrowRequestRepo.markReviewed.mockResolvedValue({ id: 1 });
    txBorrowRequestRepo.findById.mockResolvedValue(updatedRequest);

    await expect(service.approveBorrowRequest(actor, 1, input)).resolves.toEqual(updatedRequest);

    expect(borrowRequestPolicy.assertCanApprove).toHaveBeenCalledWith(actor);
    expect(borrowRequestRepository.findById).not.toHaveBeenCalled();
    expect(txBorrowRequestRepo.findByIdForUpdate).toHaveBeenCalledWith(1);
    expect(txAssetRepo.decrementAvailableQtyIfEnough).toHaveBeenCalledWith(101, 2);
    expect(txBorrowRequestRepo.updateItemApprovals).toHaveBeenCalledWith([
      { borrowRequestItemId: 11, approvedQty: 2 },
    ]);
    expect(txBorrowRequestRepo.markReviewed).toHaveBeenCalledWith(
      1,
      actor.externalUserId,
      "approved",
    );
    expect(txAuditService.record).toHaveBeenCalledOnce();
    expect(revalidateBorrowDashboardCacheMock).toHaveBeenCalledOnce();
  });
});
