import type { NextRequest } from "next/server";

import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { deleteAssetImageFiles, saveAssetImageFiles } from "@/lib/uploads/asset-images";
import {
  assetCreateSchema,
  assetListQuerySchema,
  parseAssetMultipartRequest,
} from "@/lib/validators/assets";
import { parseJsonBody, parseSearchParams } from "@/lib/validators/http";
import { createAssetStack } from "@/modules/assets/createAssetStack";

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireCurrentActor(request);
  const filters = parseSearchParams(request, assetListQuerySchema);
  const { assetService } = createAssetStack();
  const assets = await assetService.listAssets(filters);

  return successResponse(assets);
});

export const POST = withErrorHandler(async (request: Request) => {
  const actor = await requireCurrentActor(request);
  const { assetService } = createAssetStack();

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("multipart/form-data")) {
    const { input, newImages } = await parseAssetMultipartRequest(request, assetCreateSchema);
    const storedImages = await saveAssetImageFiles(newImages);

    try {
      const asset = await assetService.createAsset(actor, input, storedImages);
      return successResponse(asset, { status: 201 });
    } catch (error) {
      await deleteAssetImageFiles(storedImages.map((image) => image.storageKey));
      throw error;
    }
  }

  const input = await parseJsonBody(request, assetCreateSchema);
  const asset = await assetService.createAsset(actor, input, []);

  return successResponse(asset, { status: 201 });
});
