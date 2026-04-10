import type { NextRequest } from "next/server";

import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { logger } from "@/lib/logger";
import { hasPaginationQuery } from "@/lib/pagination";
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
  const assets = hasPaginationQuery(filters)
    ? await assetService.listAssetPage(filters)
    : await assetService.listAssets(filters);

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
      const cleanupResult = await deleteAssetImageFiles(
        storedImages.map((image) => image.storageKey),
      );

      if (cleanupResult.failedStorageKeys.length > 0) {
        logger.warn("Failed to clean up uploaded asset images after create rollback", {
          failedStorageKeys: cleanupResult.failedStorageKeys,
        });
      }

      throw error;
    }
  }

  const input = await parseJsonBody(request, assetCreateSchema);
  const asset = await assetService.createAsset(actor, input, []);

  return successResponse(asset, { status: 201 });
});
