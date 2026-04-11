import { revalidateTag, unstable_cache } from "next/cache";

import { AssetRepository, type AssetFieldOptions } from "@/modules/assets/repositories/AssetRepository";

export const ASSET_FIELD_OPTIONS_TAG = "asset-field-options";

const getAssetFieldOptionsCached = unstable_cache(
  async (): Promise<AssetFieldOptions> => {
    const repository = new AssetRepository();
    return repository.getFieldOptions();
  },
  ["asset-field-options"],
  {
    tags: [ASSET_FIELD_OPTIONS_TAG],
    revalidate: 300,
  },
);

export function getCachedAssetFieldOptions() {
  return getAssetFieldOptionsCached();
}

export function revalidateAssetFieldOptionsCache() {
  revalidateTag(ASSET_FIELD_OPTIONS_TAG, "max");
}
