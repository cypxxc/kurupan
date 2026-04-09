import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { parseRouteParams } from "@/lib/validators/http";
import { seriesIdParamsSchema } from "@/lib/validators/asset-code-series";
import { createAssetCodeSeriesStack } from "@/modules/asset-code-series/createAssetCodeSeriesStack";

export const GET = withErrorHandler(
  async (
    request: Request,
    context: RouteContext<"/api/asset-code-series/[id]/preview-code">,
  ) => {
    const actor = await requireCurrentActor(request);
    const { id } = await parseRouteParams(context.params, seriesIdParamsSchema);
    const { assetCodeSeriesService } = createAssetCodeSeriesStack();
    const previewCode = await assetCodeSeriesService.previewNextCode(actor, id);

    return successResponse(previewCode);
  },
);
