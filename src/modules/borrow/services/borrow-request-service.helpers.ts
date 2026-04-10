import {
  ConflictError,
  InsufficientStockError,
  ValidationError,
} from "@/lib/errors";
import type { BorrowRequestApproveInput } from "@/lib/validators/borrow-requests";
import type { BorrowRequestCreateInput } from "@/lib/validators/borrow-requests";
import type { AssetRepository } from "@/modules/assets/repositories/AssetRepository";

import type { BorrowRequestDetail } from "../repositories/BorrowRequestRepository";
import type { BorrowRequestStatus } from "../domain/BorrowRequestStateMachine";

type BorrowableAssetRow = Awaited<ReturnType<AssetRepository["findByIds"]>>[number];

export function buildBorrowRequestNo(id: number) {
  return `BR-${new Date().getUTCFullYear()}-${String(id).padStart(4, "0")}`;
}

export function assertAssetsCanBeBorrowed(
  input: BorrowRequestCreateInput,
  assetsById: Map<number, BorrowableAssetRow>,
) {
  for (const item of input.items) {
    const asset = assetsById.get(item.assetId);

    if (!asset) {
      throw new ValidationError("Some assets in this request do not exist", {
        assetId: item.assetId,
      });
    }

    if (asset.status !== "available") {
      throw new ConflictError("This asset is not available for borrowing", {
        assetId: item.assetId,
        status: asset.status,
      });
    }

    if (asset.availableQty < item.requestedQty) {
      throw new InsufficientStockError(
        "Requested quantity exceeds the currently available stock",
        {
          assetId: item.assetId,
          requestedQty: item.requestedQty,
          availableQty: asset.availableQty,
        },
      );
    }
  }
}

export function resolveApprovedItems(
  request: BorrowRequestDetail,
  input: BorrowRequestApproveInput,
) {
  const overrides = new Map(
    (input.items ?? []).map((item) => [item.borrowRequestItemId, item.approvedQty]),
  );

  if (input.items) {
    for (const approval of input.items) {
      const requestItem = request.items.find((item) => item.id === approval.borrowRequestItemId);

      if (!requestItem) {
        throw new ValidationError("This approval item does not belong to the request", {
          borrowRequestId: request.id,
          borrowRequestItemId: approval.borrowRequestItemId,
        });
      }

      if (approval.approvedQty > requestItem.requestedQty) {
        throw new ValidationError(
          "Approved quantity must not exceed the requested quantity",
          {
            borrowRequestItemId: requestItem.id,
            approvedQty: approval.approvedQty,
            requestedQty: requestItem.requestedQty,
          },
        );
      }
    }
  }

  const approvedItems = request.items.map((item) => ({
    ...item,
    approvedQty: overrides.get(item.id) ?? item.requestedQty,
  }));

  return approvedItems;
}

export function resolveApprovalStatus(
  approvedItems: Array<{ requestedQty: number; approvedQty: number }>,
): Extract<BorrowRequestStatus, "approved" | "partially_approved"> {
  const approvedCount = approvedItems.filter((item) => item.approvedQty > 0).length;

  if (approvedCount === 0) {
    throw new ValidationError(
      "Approve at least one item, or reject the request instead",
    );
  }

  const approvedInFull = approvedItems.every(
    (item) => item.approvedQty === item.requestedQty,
  );

  return approvedInFull ? "approved" : "partially_approved";
}

export function getRestockItemsForCancellation(
  request: Pick<BorrowRequestDetail, "status" | "items">,
) {
  if (request.status !== "approved" && request.status !== "partially_approved") {
    return [];
  }

  return request.items
    .map((item) => ({
      assetId: item.assetId,
      qty: item.approvedQty ?? 0,
    }))
    .filter((item) => item.qty > 0);
}

export function shouldNotifyBorrowerOfCancellation(
  previousStatus: BorrowRequestStatus,
  actorExternalUserId: string,
  borrowerExternalUserId: string,
) {
  return (
    (previousStatus === "approved" || previousStatus === "partially_approved") &&
    actorExternalUserId !== borrowerExternalUserId
  );
}

export function getRemainingItemsForFollowUp(
  request: Pick<BorrowRequestDetail, "status" | "items">,
) {
  if (request.status !== "partially_approved") {
    throw new ConflictError(
      "Follow-up requests can only be created from partially approved requests",
    );
  }

  const remainingItems = request.items
    .map((item) => ({
      assetId: item.assetId,
      requestedQty: Math.max(0, item.requestedQty - (item.approvedQty ?? 0)),
    }))
    .filter((item) => item.requestedQty > 0);

  if (remainingItems.length === 0) {
    throw new ValidationError("There are no remaining items to request again");
  }

  return remainingItems;
}
