import { withTransaction } from "@/db/postgres";
import {
  ConflictError,
  NotFoundError,
  ReturnExceedsApprovedError,
  ValidationError,
} from "@/lib/errors";
import type {
  ReturnCreateInput,
  ReturnListQuery,
  ReturnUpdateInput,
} from "@/lib/validators/returns";
import type { ActorContext } from "@/types/auth";
import { AuditLogRepository } from "@/modules/audit/repositories/AuditLogRepository";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";
import { AssetRepository } from "@/modules/assets/repositories/AssetRepository";
import { BorrowRequestRepository } from "@/modules/borrow/repositories/BorrowRequestRepository";

import { ReturnPolicy } from "../policies/ReturnPolicy";
import { ReturnRepository } from "../repositories/ReturnRepository";

export class ReturnService {
  constructor(
    private readonly returnRepository: ReturnRepository,
    private readonly borrowRequestRepository: BorrowRequestRepository,
    private readonly assetRepository: AssetRepository,
    private readonly returnPolicy: ReturnPolicy,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listReturns(actor: ActorContext, filters: ReturnListQuery) {
    const borrowerExternalUserId =
      actor.role === "borrower" ? actor.externalUserId : undefined;

    if (!borrowerExternalUserId) {
      this.returnPolicy.assertCanManageReturns(actor);
    }

    return this.returnRepository.findMany({
      ...filters,
      borrowerExternalUserId,
    });
  }

  async getReturnById(actor: ActorContext, id: number) {
    const record = await this.returnRepository.findById(id);

    if (!record) {
      throw new NotFoundError("Return transaction not found", { returnTransactionId: id });
    }

    this.returnPolicy.assertCanView(actor, record.borrowerExternalUserId);

    return record;
  }

  async createReturn(actor: ActorContext, input: ReturnCreateInput) {
    this.returnPolicy.assertCanManageReturns(actor);

    const request = await this.borrowRequestRepository.findById(input.borrowRequestId);

    if (!request) {
      throw new NotFoundError("Borrow request not found", {
        borrowRequestId: input.borrowRequestId,
      });
    }

    if (!["approved", "partially_returned"].includes(request.status)) {
      throw new ConflictError("Only approved requests can receive returns", {
        borrowRequestId: request.id,
        status: request.status,
      });
    }

    const requestItemsById = new Map(request.items.map((item) => [item.id, item]));
    const returnedQtyMap = await this.returnRepository.sumReturnedByBorrowRequestItemIds(
      request.items.map((item) => item.id),
    );

    for (const item of input.items) {
      const requestItem = requestItemsById.get(item.borrowRequestItemId);

      if (!requestItem) {
        throw new ValidationError("Return item does not belong to the selected request", {
          borrowRequestId: input.borrowRequestId,
          borrowRequestItemId: item.borrowRequestItemId,
        });
      }

      const approvedQty = requestItem.approvedQty ?? 0;
      const returnedQty = returnedQtyMap.get(item.borrowRequestItemId) ?? 0;

      if (approvedQty <= 0) {
        throw new ConflictError("Cannot return an item that was not approved", {
          borrowRequestItemId: item.borrowRequestItemId,
        });
      }

      if (returnedQty + item.returnQty > approvedQty) {
        throw new ReturnExceedsApprovedError(undefined, {
          borrowRequestItemId: item.borrowRequestItemId,
          approvedQty,
          alreadyReturnedQty: returnedQty,
          requestedReturnQty: item.returnQty,
        });
      }
    }

    return withTransaction(async (tx) => {
      const returnRepository = new ReturnRepository(tx);
      const borrowRequestRepository = new BorrowRequestRepository(tx);
      const assetRepository = new AssetRepository(tx);
      const auditLogService = new AuditLogService(new AuditLogRepository(tx));

      const transaction = await returnRepository.create({
        borrowRequestId: input.borrowRequestId,
        receivedByExternalUserId: actor.externalUserId,
        note: input.note,
        returnedAt: input.returnedAt ? new Date(input.returnedAt) : new Date(),
      });

      await returnRepository.insertItems(transaction.id, input.items);

      for (const item of input.items) {
        const requestItem = requestItemsById.get(item.borrowRequestItemId);

        if (!requestItem) {
          continue;
        }

        const asset =
          item.condition === "lost"
            ? await assetRepository.decrementTotalQty(requestItem.assetId, item.returnQty)
            : await assetRepository.incrementAvailableQty(requestItem.assetId, item.returnQty);

        if (!asset) {
          throw new NotFoundError("Asset not found while recording return", {
            assetId: requestItem.assetId,
          });
        }
      }

      const newReturnedMap = await returnRepository.sumReturnedByBorrowRequestItemIds(
        request.items.map((item) => item.id),
      );
      const allReturned = request.items.every((item) => {
        const approvedQty = item.approvedQty ?? 0;
        return approvedQty > 0 && (newReturnedMap.get(item.id) ?? 0) >= approvedQty;
      });

      await borrowRequestRepository.updateStatus(
        request.id,
        allReturned ? "returned" : "partially_returned",
      );

      const detail = await returnRepository.findById(transaction.id);
      const updatedRequest = await borrowRequestRepository.findById(request.id);

      if (!detail || !updatedRequest) {
        throw new NotFoundError("Return transaction not found after creation", {
          returnTransactionId: transaction.id,
        });
      }

      await auditLogService.record({
        actor,
        action: "return.create",
        entityType: "return_transaction",
        entityId: detail.id,
        afterData: {
          returnTransaction: detail,
          borrowRequest: updatedRequest,
        },
      });

      return detail;
    });
  }

  async updateReturn(actor: ActorContext, id: number, input: ReturnUpdateInput) {
    this.returnPolicy.assertCanManageReturns(actor);
    const existing = await this.getReturnById(actor, id);
    const updated = await this.returnRepository.updateNote(id, input);

    if (!updated) {
      throw new NotFoundError("Return transaction not found", { returnTransactionId: id });
    }

    const detail = await this.returnRepository.findById(updated.id);

    if (!detail) {
      throw new NotFoundError("Return transaction not found after update", {
        returnTransactionId: id,
      });
    }

    await this.auditLogService.record({
      actor,
      action: "return.update",
      entityType: "return_transaction",
      entityId: detail.id,
      beforeData: existing,
      afterData: detail,
    });

    return detail;
  }
}
