import type { AssetDetail as AssetApiDetail } from "@/types/assets";

type SerializableAssetImage = {
  id: number;
  assetId: number;
  storageKey: string;
  url: string;
  sortOrder: number;
  createdAt: Date;
};

type SerializableAssetActivity = AssetApiDetail["activity"][number];

type SerializableAssetDetail = Omit<AssetApiDetail, "createdAt" | "updatedAt" | "images" | "activity"> & {
  createdAt: Date;
  updatedAt: Date;
  images: SerializableAssetImage[];
  activity: SerializableAssetActivity[];
};

export function serializeAssetDetail(asset: SerializableAssetDetail): AssetApiDetail {
  return {
    ...asset,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
    images: asset.images.map((image) => ({
      ...image,
      createdAt: image.createdAt.toISOString(),
    })),
  };
}
