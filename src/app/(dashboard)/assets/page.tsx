import { AssetsPageClient } from "@/components/pages/assets-page-client";
import { getCachedAssetFieldOptions } from "@/modules/assets/asset-field-options-cache";
import { createAssetStack } from "@/modules/assets/createAssetStack";

export default async function AssetsPage() {
  const { assetService } = createAssetStack();
  const [initialPage, initialFieldOptions] = await Promise.all([
    assetService.listAssetPage({
      search: "",
      category: "",
      location: "",
      page: 1,
      limit: 10,
    }),
    getCachedAssetFieldOptions(),
  ]);
  const serializedPage = {
    ...initialPage,
    items: initialPage.items.map((asset) => ({
      ...asset,
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
    })),
  };

  return (
    <AssetsPageClient
      initialPage={serializedPage}
      initialFieldOptions={initialFieldOptions}
    />
  );
}
