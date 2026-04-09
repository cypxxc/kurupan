import {
  ConflictError,
  NotFoundError,
  ReturnExceedsApprovedError,
  ValidationError,
} from "@/lib/errors";
import type { ReturnCreateInput } from "@/lib/validators/returns";

import { BorrowRequestStateMachine } from "@/modules/borrow/domain/BorrowRequestStateMachine";
import type { BorrowRequestDetail } from "@/modules/borrow/repositories/BorrowRequestRepository";

type BorrowRequestItem = BorrowRequestDetail["items"][number];

export function requireReturnableBorrowRequest(
  request: BorrowRequestDetail | null,
  borrowRequestId: number,
) {
  if (!request) {
    throw new NotFoundError("ไม่พบคำขอยืม", {
      borrowRequestId,
    });
  }

  if (!BorrowRequestStateMachine.canTransition(request.status, "returned")) {
    throw new ConflictError("บันทึกการคืนได้เฉพาะคำขอที่อนุมัติแล้วเท่านั้น", {
      borrowRequestId: request.id,
      status: request.status,
    });
  }

  return request;
}

export function buildBorrowRequestItemMap(request: BorrowRequestDetail) {
  return new Map<number, BorrowRequestItem>(request.items.map((item) => [item.id, item]));
}

export function validateReturnItems(
  input: ReturnCreateInput,
  request: BorrowRequestDetail,
  requestItemsById: Map<number, BorrowRequestItem>,
  returnedQtyMap: Map<number, number>,
) {
  for (const item of input.items) {
    const requestItem = requestItemsById.get(item.borrowRequestItemId);

    if (!requestItem) {
      throw new ValidationError("รายการคืนไม่ได้อยู่ในคำขอที่เลือก", {
        borrowRequestId: input.borrowRequestId,
        borrowRequestItemId: item.borrowRequestItemId,
      });
    }

    const approvedQty = requestItem.approvedQty ?? 0;
    const returnedQty = returnedQtyMap.get(item.borrowRequestItemId) ?? 0;

    if (approvedQty <= 0) {
      throw new ConflictError("ไม่สามารถคืนรายการที่ไม่ได้รับการอนุมัติได้", {
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
}

export function isBorrowRequestFullyReturned(
  request: BorrowRequestDetail,
  returnedQtyMap: Map<number, number>,
) {
  return request.items.every((item) => {
    const approvedQty = item.approvedQty ?? 0;
    return approvedQty > 0 && (returnedQtyMap.get(item.id) ?? 0) >= approvedQty;
  });
}
