import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { logger } from "@/lib/logger";
import { deleteAssetImageFiles, saveAssetImageFiles } from "@/lib/uploads/asset-images";
import {
  assetIdParamsSchema,
  assetUpdateSchema,
  parseAssetMultipartRequest,
} from "@/lib/validators/assets";
import { parseJsonBody, parseRouteParams } from "@/lib/validators/http";
import { createAssetStack } from "@/modules/assets/createAssetStack";

export const GET = withErrorHandler(
  async (
    request: Request,
    context: RouteContext<"/api/assets/[id]">,
  ) => {
    await requireCurrentActor(request);
    const { id } = await parseRouteParams(context.params, assetIdParamsSchema);
    const { assetService } = createAssetStack();
    const asset = await assetService.getAssetById(id);

    return successResponse(asset);
  },
);

export const PATCH = withErrorHandler(
  async (
    request: Request,
    context: RouteContext<"/api/assets/[id]">,
  ) => {
    const actor = await requireCurrentActor(request);
    const { id } = await parseRouteParams(context.params, assetIdParamsSchema);
    const { assetService } = createAssetStack();
    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

    if (!contentType.includes("multipart/form-data")) {
      const input = await parseJsonBody(request, assetUpdateSchema);
      const result = await assetService.updateAsset(actor, id, input);

      return successResponse(result.asset);
    }

    const { input, keptImageIds, newImages } = await parseAssetMultipartRequest(
      request,
      assetUpdateSchema,
    );
    const storedImages = await saveAssetImageFiles(newImages);

    try {
      const result = await assetService.updateAsset(actor, id, input, {
        keptImageIds,
        newImages: storedImages,
      });

      const cleanupResult = await deleteAssetImageFiles(
        result.removedImages.map((image) => image.storageKey),
      );

      if (cleanupResult.failedStorageKeys.length > 0) {
        logger.warn("Failed to delete replaced asset image files after asset update", {
          assetId: id,
          failedStorageKeys: cleanupResult.failedStorageKeys,
        });
      }

      return successResponse(result.asset);
    } catch (error) {
      const cleanupResult = await deleteAssetImageFiles(
        storedImages.map((image) => image.storageKey),
      );

      if (cleanupResult.failedStorageKeys.length > 0) {
        logger.warn("Failed to clean up uploaded asset image files after update error", {
          assetId: id,
          failedStorageKeys: cleanupResult.failedStorageKeys,
        });
      }

      throw error;
    }
  },
);

export const DELETE = withErrorHandler(
  async (
    request: Request,
    context: RouteContext<"/api/assets/[id]">,
  ) => {
    const actor = await requireCurrentActor(request);
    const { id } = await parseRouteParams(context.params, assetIdParamsSchema);
    const { assetService } = createAssetStack();
    const result = await assetService.deleteAsset(actor, id);

    const cleanupResult = await deleteAssetImageFiles(
      result.removedImages.map((image) => image.storageKey),
    );

    if (cleanupResult.failedStorageKeys.length > 0) {
      logger.warn("Failed to delete asset image files after asset deletion", {
        assetId: id,
        failedStorageKeys: cleanupResult.failedStorageKeys,
      });
    }

    return successResponse({
      id: result.deletedAsset.id,
    });
  },
);
