export const ASSET_STATUS_VALUES = [
  "available",
  "maintenance",
  "retired",
] as const;

export type AssetStatus = (typeof ASSET_STATUS_VALUES)[number];

export type Asset = {
  id: number;
  assetCode: string;
  name: string;
  category: string | null;
  description: string | null;
  location: string | null;
  totalQty: number;
  availableQty: number;
  status: AssetStatus;
  createdAt: string;
  updatedAt: string;
};

export type AssetActivity = {
  id: string;
  type: "borrow" | "return";
  occurredAt: string;
  requestNo: string;
  borrowerName: string;
  qty: number;
  status: string;
  note: string | null;
};

export type AssetDetail = Asset & {
  activity: AssetActivity[];
};

export type AssetFormValues = {
  assetCode: string;
  name: string;
  category: string;
  description: string;
  location: string;
  totalQty: string;
  status: AssetStatus;
};

export const DEFAULT_ASSET_FORM_VALUES: AssetFormValues = {
  assetCode: "",
  name: "",
  category: "",
  description: "",
  location: "",
  totalQty: "0",
  status: "available",
};

export function toAssetFormValues(asset: Asset): AssetFormValues {
  return {
    assetCode: asset.assetCode,
    name: asset.name,
    category: asset.category ?? "",
    description: asset.description ?? "",
    location: asset.location ?? "",
    totalQty: String(asset.totalQty),
    status: asset.status,
  };
}
