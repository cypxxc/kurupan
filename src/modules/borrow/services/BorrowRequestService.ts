import { withTransaction } from "@/db/postgres";
import { ConflictError, InsufficientStockError, NotFoundError, ValidationError } from "@/lib/errors";
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
import { AuditLogRepository } from "@/modules/audit/repositories/AuditLogRepository";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";
import { AssetRepository } from "@/modules/assets/repositories/AssetRepository";

import { BorrowRequestPolicy } from "../policies/BorrowRequestPolicy";
import {
  BorrowRequestRepository,
  type BorrowRequestDetail,
} from "../repositories/BorrowRequestRepository";

export class BorrowRequestService {
  constructor(
    private readonly borrowRequestRepository: BorrowRequestRepository,
    private readonly assetRepository: AssetRepository,
    private readonly borrowRequestPolicy: BorrowRequestPolicy,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listBorrowRequests(actor: ActorContext, filters: BorrowRequestListQuery) {
    const borrowerExternalUserId =
      actor.role === "borrower" ? actor.externalUserId : filters.borrower;

    return this.borrowRequestRepository.findMany({
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

    const assetIds = input.items.map((item) => item.assetId);
    const assetRows = await this.assetRepository.findByIds(assetIds);
    const assetsById = new Map(assetRows.map((asset) => [asset.id, asset]));

    for (const item of input.items) {
      const asset = assetsById.get(item.assetId);

      if (!asset) {
        throw new ValidationError("One or more requested assets do not exist", {
          assetId: item.assetId,
        });
      }

      if (asset.status !== "available") {
        throw new ConflictError("Asset is not available for borrowing", {
          assetId: item.assetId,
          status: asset.status,
        });
      }

      if (asset.availableQty < item.requestedQty) {
        throw new InsufficientStockError("Requested quantity exceeds current stock", {
          assetId: item.assetId,
          requestedQty: item.requestedQty,
          availableQty: asset.availableQty,
        });
      }
    }

    return withTransaction(async (tx) => {
      const borrowRequestRepository = new BorrowRequestRepository(tx);
      const auditLogService = new AuditLogService(new AuditLogRepository(tx));

      const created = await borrowRequestRepository.create({
        borrowerExternalUserId: actor.externalUserId,
        requestNo: `TMP-${Date.now()}`,
        purpose: input.purpose,
        startDate: input.startDate,
        dueDate: input.dueDate,
      });

      const requestNo = this.buildRequestNo(created.id);
      await borrowRequestRepository.updateRequestNo(created.id, requestNo);
      await borrowRequestRepository.insertItems(created.id, input.items);

      const detail = await borrowRequestRepository.findById(created.id);

      if (!detail) {
        throw new NotFoundError("Borrow request not found after creation", {
          borrowRequestId: created.id,
        });
      }

      await auditLogService.record({
        actor,
        action: "borrow_request.create",
        entityType: "borrow_request",
        entityId: detail.id,
        afterData: detail,
      });

      return detail;
    });
  }

  async approveBorrowRequest(
    actor: ActorContext,
    id: number,
    input: BorrowRequestApproveInput,
  ) {
    this.borrowRequestPolicy.assertCanApprove(actor);

    const request = await this.borrowRequestRepository.findById(id);

    if (!request) {
      throw new NotFoundError("Borrow request not found", { borrowRequestId: id });
    }

    if (request.status !== "pending") {
      throw new ConflictError("Only pending requests can be approved", {
        borrowRequestId: id,
        status: request.status,
      });
    }

    const approvedItems = this.resolveApprovals(request, input);

    return withTransaction(async (tx) => {
      const borrowRequestRepository = new BorrowRequestRepository(tx);
      const assetRepository = new AssetRepository(tx);
      const auditLogService = new AuditLogService(new AuditLogRepository(tx));

      for (const item of approvedItems) {
        const asset = await assetRepository.decrementAvailableQtyIfEnough(
          item.assetId,
          item.approvedQty,
        );

        if (!asset) {
          throw new InsufficientStockError("Insufficient stock to approve request", {
            assetId: item.assetId,
            approvedQty: item.approvedQty,
          });
        }
      }

      await borrowRequestRepository.updateItemApprovals(
        approvedItems.map((item) => ({
          borrowRequestItemId: item.id,
          approvedQty: item.approvedQty,
        })),
      );
      await borrowRequestRepository.markApproved(id, actor.externalUserId);

      const updated = await borrowRequestRepository.findById(id);

      if (!updated) {
        throw new NotFoundError("Borrow request not found after approval", {
          borrowRequestId: id,
        });
      }

      await auditLogService.record({
        actor,
        action: "borrow_request.approve",
        entityType: "borrow_request",
        entityId: updated.id,
        beforeData: request,
        afterData: updated,
      });

      return updated;
    });
  }

  async rejectBorrowRequest(
    actor: ActorContext,
    id: number,
    input: BorrowRequestRejectInput,
  ) {
    this.borrowRequestPolicy.assertCanApprove(actor);

    const request = await this.borrowRequestRepository.findById(id);

    if (!request) {
      throw new NotFoundError("Borrow request not found", { borrowRequestId: id });
    }

    if (request.status !== "pending") {
      throw new ConflictError("Only pending requests can be rejected", {
        borrowRequestId: id,
        status: request.status,
      });
    }

    return withTransaction(async (tx) => {
      const borrowRequestRepository = new BorrowRequestRepository(tx);
      const auditLogService = new AuditLogService(new AuditLogRepository(tx));

      await borrowRequestRepository.markRejected(
        id,
        actor.externalUserId,
        input.rejectionReason,
      );

      const updated = await borrowRequestRepository.findById(id);

      if (!updated) {
        throw new NotFoundError("Borrow request not found after rejection", {
          borrowRequestId: id,
        });
      }

      await auditLogService.record({
        actor,
        action: "borrow_request.reject",
        entityType: "borrow_request",
        entityId: updated.id,
        beforeData: request,
        afterData: updated,
      });

      return updated;
    });
  }

  async cancelBorrowRequest(
    actor: ActorContext,
    id: number,
    input: BorrowRequestCancelInput,
  ) {
    const request = await this.borrowRequestRepository.findById(id);

    if (!request) {
      throw new NotFoundError("Borrow request not found", { borrowRequestId: id });
    }

    if (request.status !== "pending") {
      throw new ConflictError("Only pending requests can be cancelled", {
        borrowRequestId: id,
        status: request.status,
      });
    }

    if (
      actor.role === "borrower" &&
      request.borrowerExternalUserId !== actor.externalUserId
    ) {
      throw new ConflictError("You can only cancel your own pending request");
    }

    return withTransaction(async (tx) => {
      const borrowRequestRepository = new BorrowRequestRepository(tx);
      const auditLogService = new AuditLogService(new AuditLogRepository(tx));

      await borrowRequestRepository.markCancelled(
        id,
        actor.externalUserId,
        input.cancelReason,
      );

      const updated = await borrowRequestRepository.findById(id);

      if (!updated) {
        throw new NotFoundError("Borrow request not found after cancellation", {
          borrowRequestId: id,
        });
      }

      await auditLogService.record({
        actor,
        action: "borrow_request.cancel",
        entityType: "borrow_request",
        entityId: updated.id,
        beforeData: request,
        afterData: updated,
      });

      return updated;
    });
  }

  private buildRequestNo(id: number) {
    return `BR-${new Date().getUTCFullYear()}-${String(id).padStart(4, "0")}`;
  }

  private resolveApprovals(
    request: BorrowRequestDetail,
    input: BorrowRequestApproveInput,
  ) {
    const overrides = new Map(
      (input.items ?? []).map((item) => [item.borrowRequestItemId, item.approvedQty]),
    );

    const approvedItems = request.items.map((item) => ({
      ...item,
      approvedQty: overrides.get(item.id) ?? item.requestedQty,
    }));

    if (input.items) {
      for (const approval of input.items) {
        const requestItem = request.items.find((item) => item.id === approval.borrowRequestItemId);

        if (!requestItem) {
          throw new ValidationError("Approval item does not belong to this request", {
            borrowRequestId: request.id,
            borrowRequestItemId: approval.borrowRequestItemId,
          });
        }
      }
    }

    for (const item of approvedItems) {
      if (item.approvedQty > item.requestedQty) {
        throw new ValidationError("Approved quantity cannot exceed requested quantity", {
          borrowRequestItemId: item.id,
          approvedQty: item.approvedQty,
          requestedQty: item.requestedQty,
        });
      }
    }

    return approvedItems;
  }
}
