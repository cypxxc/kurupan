import { AssetsPageClient } from "@/components/pages/assets-page-client";
import { createAssetStack } from "@/modules/assets/createAssetStack";

export default async function AssetsPage() {
  const { assetService } = createAssetStack();
  const initialAssets = await assetService.listAssets({
    search: "",
    category: "",
    location: "",
  });
  const serializedAssets = initialAssets.map((asset) => ({
    ...asset,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  }));

  return <AssetsPageClient initialAssets={serializedAssets} />;
}
