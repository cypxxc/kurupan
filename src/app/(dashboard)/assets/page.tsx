import { AssetsPageClient } from "@/components/pages/assets-page-client";
import { createAssetStack } from "@/modules/assets/createAssetStack";

export default async function AssetsPage() {
  const { assetService } = createAssetStack();
  const initialPage = await assetService.listAssetPage({
    search: "",
    category: "",
    location: "",
    page: 1,
    limit: 10,
  });
  const serializedPage = {
    ...initialPage,
    items: initialPage.items.map((asset) => ({
      ...asset,
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
    })),
  };

  return <AssetsPageClient initialPage={serializedPage} />;
}
