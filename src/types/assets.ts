export const ASSET_STATUS_VALUES = [
  "available",
  "maintenance",
  "retired",
] as const;

export type AssetStatus = (typeof ASSET_STATUS_VALUES)[number];

export type AssetImage = {
  id: number;
  assetId: number;
  storageKey: string;
  url: string;
  sortOrder: number;
  createdAt: string;
};

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
  assetCodeSeriesId: number | null;
  purchasePrice: string | null;
  purchaseDate: string | null;
  usefulLifeYears: number | null;
  residualValue: string | null;
  primaryImageUrl: string | null;
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
  images: AssetImage[];
  activity: AssetActivity[];
};

export type AssetFormValues = {
  seriesId: string;
  assetCode: string;
  name: string;
  category: string;
  description: string;
  location: string;
  totalQty: string;
  status: AssetStatus;
  purchasePrice: string;
  purchaseDate: string;
  usefulLifeYears: string;
  residualValue: string;
};

export const DEFAULT_ASSET_FORM_VALUES: AssetFormValues = {
  seriesId: "",
  assetCode: "",
  name: "",
  category: "",
  description: "",
  location: "",
  totalQty: "0",
  status: "available",
  purchasePrice: "",
  purchaseDate: "",
  usefulLifeYears: "",
  residualValue: "1",
};

export function toAssetFormValues(asset: Asset): AssetFormValues {
  return {
    seriesId: asset.assetCodeSeriesId ? String(asset.assetCodeSeriesId) : "",
    assetCode: asset.assetCode,
    name: asset.name,
    category: asset.category ?? "",
    description: asset.description ?? "",
    location: asset.location ?? "",
    totalQty: String(asset.totalQty),
    status: asset.status,
    purchasePrice: asset.purchasePrice ?? "",
    purchaseDate: asset.purchaseDate ?? "",
    usefulLifeYears: asset.usefulLifeYears ? String(asset.usefulLifeYears) : "",
    residualValue: asset.residualValue ?? "1",
  };
}
