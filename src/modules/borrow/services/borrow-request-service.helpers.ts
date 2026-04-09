import {
  ConflictError,
  InsufficientStockError,
  ValidationError,
} from "@/lib/errors";
import type { BorrowRequestApproveInput } from "@/lib/validators/borrow-requests";
import type { BorrowRequestCreateInput } from "@/lib/validators/borrow-requests";
import type { AssetRepository } from "@/modules/assets/repositories/AssetRepository";

import type { BorrowRequestDetail } from "../repositories/BorrowRequestRepository";

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
    }
  }

  const approvedItems = request.items.map((item) => ({
    ...item,
    approvedQty: overrides.get(item.id) ?? item.requestedQty,
  }));

  for (const item of approvedItems) {
    if (item.approvedQty > item.requestedQty) {
      throw new ValidationError(
        "Approved quantity must not exceed the requested quantity",
        {
          borrowRequestItemId: item.id,
          approvedQty: item.approvedQty,
          requestedQty: item.requestedQty,
        },
      );
    }
  }

  return approvedItems;
}
