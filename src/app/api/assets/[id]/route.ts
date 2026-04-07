import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { assetIdParamsSchema, assetUpdateSchema } from "@/lib/validators/assets";
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
    const input = await parseJsonBody(request, assetUpdateSchema);
    const { assetService } = createAssetStack();
    const asset = await assetService.updateAsset(actor, id, input);

    return successResponse(asset);
  },
);
