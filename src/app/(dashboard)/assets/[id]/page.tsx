import { redirect } from "next/navigation";

import { NotFoundError } from "@/lib/errors";
import { getCurrentActorFromServer } from "@/lib/server-auth";
import { createAssetStack } from "@/modules/assets/createAssetStack";
import { serializeAssetDetail } from "@/modules/assets/serializers";

import AssetDetailPageClient from "./asset-detail-page-client";

type AssetDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AssetDetailPage({ params }: AssetDetailPageProps) {
  const actor = await getCurrentActorFromServer();

  if (!actor) {
    redirect("/login");
  }

  const { id } = await params;
  const assetId = Number(id);

  if (!Number.isInteger(assetId) || assetId < 1) {
    return <AssetDetailPageClient initialAsset={null} />;
  }

  let initialAsset = null;

  try {
    const { assetService } = createAssetStack();
    const asset = await assetService.getAssetById(assetId, {
      includeActivity: actor.role === "staff" || actor.role === "admin",
    });

    initialAsset = serializeAssetDetail(asset);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return <AssetDetailPageClient initialAsset={null} />;
    }

    throw error;
  }

  return <AssetDetailPageClient initialAsset={initialAsset} />;
}
