import { withTransactionContext } from "@/db/postgres";
import {
  AuthorizationError,
  ConflictError,
  InsufficientStockError,
  NotFoundError,
} from "@/lib/errors";
import type { PaginatedResult } from "@/lib/pagination";
import type {
  BorrowRequestCancelInput,
  BorrowRequestRejectInput,
} from "@/lib/validators/borrow-request-actions";
import type {
  BorrowRequestApproveInput,
  BorrowRequestCreateInput,
  BorrowRequestListQuery,
} from "@/lib/validators/borrow-requests";
import type { ActorContext } from "@/types/auth";
import { AssetRepository } from "@/modules/assets/repositories/AssetRepository";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";
import { logger } from "@/lib/logger";
import { NotificationService } from "@/modules/notifications/services/NotificationService";

import {
  BorrowRequestStateMachine,
  type BorrowRequestStatus,
} from "../domain/BorrowRequestStateMachine";
import { BorrowRequestPolicy } from "../policies/BorrowRequestPolicy";
import {
  BorrowRequestRepository,
  type BorrowRequestDetail,
} from "../repositories/BorrowRequestRepository";
import {
  assertAssetsCanBeBorrowed,
  buildBorrowRequestNo,
  getRemainingItemsForFollowUp,
  getRestockItemsForCancellation,
  resolveApprovalStatus,
  resolveApprovedItems,
  shouldNotifyBorrowerOfCancellation,
} from "./borrow-request-service.helpers";

export class BorrowRequestService {
  constructor(
    private readonly borrowRequestRepository: BorrowRequestRepository,
    private readonly assetRepository: AssetRepository,
    private readonly borrowRequestPolicy: BorrowRequestPolicy,
    private readonly auditLogService: AuditLogService,
    private readonly notificationService?: NotificationService,
  ) {}

  async listBorrowRequests(actor: ActorContext, filters: BorrowRequestListQuery) {
    const borrowerExternalUserId =
      actor.role === "borrower" ? actor.externalUserId : filters.borrower;

    return this.borrowRequestRepository.findMany({
      ...filters,
      borrowerExternalUserId,
    });
  }

  async listBorrowRequestPage(
    actor: ActorContext,
    filters: BorrowRequestListQuery,
  ): Promise<PaginatedResult<BorrowRequestDetail>> {
    const borrowerExternalUserId =
      actor.role === "borrower" ? actor.externalUserId : filters.borrower;

    return this.borrowRequestRepository.findPage({
      ...filters,
      borrowerExternalUserId,
    });
  }

  async getBorrowRequestById(actor: ActorContext, id: number) {
    const request = await this.borrowRequestRepository.findById(id);

    if (!request) {
      throw new NotFoundError("Borrow request not found", { borrowRequestId: id });
    }

    this.borrowRequestPolicy.assertCanView(actor, request.borrowerExternalUserId);

    return request;
  }

  async createBorrowRequest(actor: ActorContext, input: BorrowRequestCreateInput) {
    this.borrowRequestPolicy.assertCanCreate(actor);
    const detail = await this.createBorrowRequestRecord(actor, actor.externalUserId, input);

    this.notifyAsync(() => this.notificationService?.notifyBorrowRequestCreated(detail));

    return detail;
  }

  async createFollowUpBorrowRequest(actor: ActorContext, id: number) {
    const request = await this.getBorrowRequestById(actor, id);

    if (actor.externalUserId !== request.borrowerExternalUserId) {
      throw new AuthorizationError(
        "Only the borrower can create a follow-up request for the remaining items",
      );
    }

    const remainingItems = getRemainingItemsForFollowUp(request);
    const detail = await this.createBorrowRequestRecord(actor, request.borrowerExternalUserId, {
      purpose: request.purpose ?? "Follow-up request",
      startDate: request.startDate,
      dueDate: request.dueDate,
      items: remainingItems,
    });

    this.notifyAsync(() => this.notificationService?.notifyBorrowRequestCreated(detail));

    return detail;
  }

  async approveBorrowRequest(
    actor: ActorContext,
    id: number,
    input: BorrowRequestApproveInput,
  ) {
    this.borrowRequestPolicy.assertCanApprove(actor);

    const request = await this.getRequestOrThrow(id);
    const approvedItems = resolveApprovedItems(request, input);
    const nextStatus = resolveApprovalStatus(approvedItems);

    this.assertRequestTransition(request.status, nextStatus);

    const updated = await withTransactionContext(async (ctx) => {
      for (const item of approvedItems) {
        if (item.approvedQty === 0) {
          continue;
        }

        const asset = await ctx.assetRepo.decrementAvailableQtyIfEnough(item.assetId, item.approvedQty);

        if (!asset) {
          throw new InsufficientStockError(
            "Not enough available stock to approve this request",
            {
              assetId: item.assetId,
              approvedQty: item.approvedQty,
            },
          );
        }
      }

      await ctx.borrowRequestRepo.updateItemApprovals(
        approvedItems.map((item) => ({
          borrowRequestItemId: item.id,
          approvedQty: item.approvedQty,
        })),
      );
      const reviewed = await ctx.borrowRequestRepo.markReviewed(
        id,
        actor.externalUserId,
        nextStatus,
      );

      if (!reviewed) {
        throw new ConflictError("Borrow request is no longer pending", {
          borrowRequestId: id,
        });
      }

      const updated = await ctx.borrowRequestRepo.findById(id);

      if (!updated) {
        throw new NotFoundError("Borrow request not found after approval", {
          borrowRequestId: id,
        });
      }

      await ctx.auditService.record({
        actor,
        action: "borrow_request.approve",
        entityType: "borrow_request",
        entityId: updated.id,
        beforeData: request,
        afterData: updated,
      });

      return updated;
    });

    this.notifyAsync(() => this.notificationService?.notifyBorrowRequestApproved(updated));

    return updated;
  }

  async rejectBorrowRequest(
    actor: ActorContext,
    id: number,
    input: BorrowRequestRejectInput,
  ) {
    this.borrowRequestPolicy.assertCanApprove(actor);

    const request = await this.requireRequestTransition(id, "rejected");

    const updated = await withTransactionContext(async (ctx) => {
      const rejected = await ctx.borrowRequestRepo.markRejected(
        id,
        actor.externalUserId,
        input.rejectionReason,
        request.status,
      );

      if (!rejected) {
        throw new ConflictError("Borrow request is no longer pending", {
          borrowRequestId: id,
        });
      }

      const updated = await ctx.borrowRequestRepo.findById(id);

      if (!updated) {
        throw new NotFoundError("Borrow request not found after rejection", {
          borrowRequestId: id,
        });
      }

      await ctx.auditService.record({
        actor,
        action: "borrow_request.reject",
        entityType: "borrow_request",
        entityId: updated.id,
        beforeData: request,
        afterData: updated,
      });

      return updated;
    });

    this.notifyAsync(() => this.notificationService?.notifyBorrowRequestRejected(updated));

    return updated;
  }

  async cancelBorrowRequest(
    actor: ActorContext,
    id: number,
    input: BorrowRequestCancelInput,
  ) {
    const request = await this.requireRequestTransition(id, "cancelled");
    const restockItems = getRestockItemsForCancellation(request);

    if (actor.role === "borrower" && request.borrowerExternalUserId !== actor.externalUserId) {
      throw new ConflictError(
        "Borrowers can cancel only their own pending requests",
      );
    }

    const updated = await withTransactionContext(async (ctx) => {
      const cancelled = await ctx.borrowRequestRepo.markCancelled(
        id,
        actor.externalUserId,
        input.cancelReason,
        request.status,
      );

      if (!cancelled) {
        throw new ConflictError("Borrow request can no longer be cancelled", {
          borrowRequestId: id,
          status: request.status,
        });
      }

      for (const item of restockItems) {
        const asset = await ctx.assetRepo.incrementAvailableQty(item.assetId, item.qty);

        if (!asset) {
          throw new NotFoundError("Asset not found while restoring cancelled approval", {
            assetId: item.assetId,
            borrowRequestId: id,
          });
        }
      }

      const updated = await ctx.borrowRequestRepo.findById(id);

      if (!updated) {
        throw new NotFoundError("Borrow request not found after cancellation", {
          borrowRequestId: id,
        });
      }

      await ctx.auditService.record({
        actor,
        action: "borrow_request.cancel",
        entityType: "borrow_request",
        entityId: updated.id,
        beforeData: request,
        afterData: updated,
      });

      return updated;
    });

    this.notifyAsync(async () => {
      await this.notificationService?.notifyBorrowRequestCancelled(updated);

      if (
        shouldNotifyBorrowerOfCancellation(
          request.status,
          actor.externalUserId,
          request.borrowerExternalUserId,
        )
      ) {
        await this.notificationService?.notifyBorrowRequestApprovalCancelled(updated);
      }
    });

    return updated;
  }

  private async requireRequestTransition(
    id: number,
    nextStatus: BorrowRequestStatus,
  ): Promise<BorrowRequestDetail> {
    const request = await this.getRequestOrThrow(id);
    this.assertRequestTransition(request.status, nextStatus);

    return request;
  }

  private async getRequestOrThrow(id: number): Promise<BorrowRequestDetail> {
    const request = await this.borrowRequestRepository.findById(id);

    if (!request) {
      throw new NotFoundError("Borrow request not found", { borrowRequestId: id });
    }

    return request;
  }

  private async createBorrowRequestRecord(
    actor: ActorContext,
    borrowerExternalUserId: string,
    input: BorrowRequestCreateInput,
  ) {
    const assetIds = input.items.map((item) => item.assetId);
    const assetRows = await this.assetRepository.findByIds(assetIds);
    const assetsById = new Map(assetRows.map((asset) => [asset.id, asset]));

    assertAssetsCanBeBorrowed(input, assetsById);

    return withTransactionContext(async (ctx) => {
      const created = await ctx.borrowRequestRepo.create({
        borrowerExternalUserId,
        requestNo: `TMP-${Date.now()}`,
        purpose: input.purpose,
        startDate: input.startDate,
        dueDate: input.dueDate,
      });

      await ctx.borrowRequestRepo.updateRequestNo(created.id, buildBorrowRequestNo(created.id));
      await ctx.borrowRequestRepo.insertItems(created.id, input.items);

      const detail = await ctx.borrowRequestRepo.findById(created.id);

      if (!detail) {
        throw new NotFoundError("Borrow request not found after creation", {
          borrowRequestId: created.id,
        });
      }

      await ctx.auditService.record({
        actor,
        action: "borrow_request.create",
        entityType: "borrow_request",
        entityId: detail.id,
        afterData: detail,
      });

      return detail;
    });
  }

  private assertRequestTransition(
    currentStatus: BorrowRequestStatus,
    nextStatus: BorrowRequestStatus,
  ) {
    BorrowRequestStateMachine.assertCanTransition(currentStatus, nextStatus);
  }

  private notifyAsync(fn: () => Promise<void> | undefined) {
    fn()?.catch((error) => {
      logger.error("Notification delivery failed", { error });
    });
  }
}
