import { withTransactionContext } from "@/db/postgres";
import { NotFoundError } from "@/lib/errors";
import type {
  ReturnCreateInput,
  ReturnListQuery,
  ReturnUpdateInput,
} from "@/lib/validators/returns";
import type { ActorContext } from "@/types/auth";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";
import { AssetRepository } from "@/modules/assets/repositories/AssetRepository";
import { BorrowRequestStateMachine } from "@/modules/borrow/domain/BorrowRequestStateMachine";
import { BorrowRequestRepository } from "@/modules/borrow/repositories/BorrowRequestRepository";
import { logger } from "@/lib/logger";
import { NotificationService } from "@/modules/notifications/services/NotificationService";

import { ReturnPolicy } from "../policies/ReturnPolicy";
import { ReturnRepository } from "../repositories/ReturnRepository";
import {
  buildBorrowRequestItemMap,
  isBorrowRequestFullyReturned,
  requireReturnableBorrowRequest,
  validateReturnItems,
} from "./return-service.helpers";

export class ReturnService {
  constructor(
    private readonly returnRepository: ReturnRepository,
    private readonly borrowRequestRepository: BorrowRequestRepository,
    private readonly assetRepository: AssetRepository,
    private readonly returnPolicy: ReturnPolicy,
    private readonly auditLogService: AuditLogService,
    private readonly notificationService?: NotificationService,
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

  async listReturnsPage(actor: ActorContext, filters: ReturnListQuery) {
    const borrowerExternalUserId =
      actor.role === "borrower" ? actor.externalUserId : undefined;

    if (!borrowerExternalUserId) {
      this.returnPolicy.assertCanManageReturns(actor);
    }

    return this.returnRepository.findPage({
      ...filters,
      borrowerExternalUserId,
    });
  }

  async getReturnById(actor: ActorContext, id: number) {
    const record = await this.returnRepository.findById(id);

    if (!record) {
      throw new NotFoundError("ไม่พบรายการคืน", { returnTransactionId: id });
    }

    this.returnPolicy.assertCanView(actor, record.borrowerExternalUserId);

    return record;
  }

  async createReturn(actor: ActorContext, input: ReturnCreateInput) {
    this.returnPolicy.assertCanManageReturns(actor);

    const request = requireReturnableBorrowRequest(
      await this.borrowRequestRepository.findById(input.borrowRequestId),
      input.borrowRequestId,
    );
    const requestItemsById = buildBorrowRequestItemMap(request);
    const returnedQtyMap = await this.returnRepository.sumReturnedByBorrowRequestItemIds(
      request.items.map((item) => item.id),
    );

    validateReturnItems(input, request, requestItemsById, returnedQtyMap);

    const detail = await withTransactionContext(async (ctx) => {
      const transaction = await ctx.returnRepo.create({
        borrowRequestId: input.borrowRequestId,
        receivedByExternalUserId: actor.externalUserId,
        note: input.note,
        returnedAt: input.returnedAt ? new Date(input.returnedAt) : new Date(),
      });

      await ctx.returnRepo.insertItems(transaction.id, input.items);

      const assetResults = await Promise.all(
        input.items.map((item) => {
          const requestItem = requestItemsById.get(item.borrowRequestItemId);

          if (!requestItem) return Promise.resolve(null);

          if (item.condition === "lost") {
            return ctx.assetRepo.decrementTotalQty(requestItem.assetId, item.returnQty);
          } else if (item.condition === "damaged") {
            return ctx.assetRepo.updateStatus(requestItem.assetId, "maintenance");
          } else {
            return ctx.assetRepo.incrementAvailableQty(requestItem.assetId, item.returnQty);
          }
        }),
      );

      for (let i = 0; i < input.items.length; i++) {
        const requestItem = requestItemsById.get(input.items[i]!.borrowRequestItemId);
        if (!requestItem) continue;

        if (!assetResults[i]) {
          throw new NotFoundError("ไม่พบครุภัณฑ์ระหว่างบันทึกการคืน", {
            assetId: requestItem.assetId,
          });
        }
      }

      const newReturnedMap = await ctx.returnRepo.sumReturnedByBorrowRequestItemIds(
        request.items.map((item) => item.id),
      );
      const allReturned = isBorrowRequestFullyReturned(request, newReturnedMap);
      const nextStatus = allReturned ? "returned" : "partially_returned";

      BorrowRequestStateMachine.assertCanTransition(request.status, nextStatus);

      await ctx.borrowRequestRepo.updateStatus(request.id, nextStatus);

      const detail = await ctx.returnRepo.findById(transaction.id);
      const updatedRequest = await ctx.borrowRequestRepo.findById(request.id);

      if (!detail || !updatedRequest) {
        throw new NotFoundError("ไม่พบรายการคืนหลังบันทึกข้อมูล", {
          returnTransactionId: transaction.id,
        });
      }

      await ctx.auditService.record({
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

    this.notifyAsync(() => this.notificationService?.notifyReturnRecorded(detail));

    return detail;
  }

  async updateReturn(actor: ActorContext, id: number, input: ReturnUpdateInput) {
    this.returnPolicy.assertCanManageReturns(actor);

    const existing = await this.getReturnById(actor, id);
    const updated = await this.returnRepository.updateNote(id, input);

    if (!updated) {
      throw new NotFoundError("ไม่พบรายการคืน", { returnTransactionId: id });
    }

    const detail = await this.returnRepository.findById(updated.id);

    if (!detail) {
      throw new NotFoundError("ไม่พบรายการคืนหลังอัปเดต", {
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

  private notifyAsync(fn: () => Promise<void> | undefined) {
    fn()?.catch((error) => {
      logger.error("Notification delivery failed", { error });
    });
  }
}
