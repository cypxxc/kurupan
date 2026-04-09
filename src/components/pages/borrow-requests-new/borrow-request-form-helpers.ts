import type {
  BorrowRequestFormItem,
  BorrowableAsset,
} from "@/types/borrow-requests";

export function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function makeBorrowRequestItem(asset: BorrowableAsset): BorrowRequestFormItem {
  return {
    assetId: asset.id,
    assetCode: asset.assetCode,
    assetName: asset.name,
    category: asset.category,
    location: asset.location,
    availableQty: asset.availableQty,
    requestedQty: 1,
  };
}
