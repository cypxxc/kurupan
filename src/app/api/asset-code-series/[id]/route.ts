import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { parseJsonBody, parseRouteParams } from "@/lib/validators/http";
import {
  seriesIdParamsSchema,
  seriesUpdateSchema,
} from "@/lib/validators/asset-code-series";
import { createAssetCodeSeriesStack } from "@/modules/asset-code-series/createAssetCodeSeriesStack";

export const GET = withErrorHandler(
  async (
    request: Request,
    context: RouteContext<"/api/asset-code-series/[id]">,
  ) => {
    const actor = await requireCurrentActor(request);
    const { id } = await parseRouteParams(context.params, seriesIdParamsSchema);
    const { assetCodeSeriesService } = createAssetCodeSeriesStack();
    const series = await assetCodeSeriesService.getSeriesById(actor, id);

    return successResponse(series);
  },
);

export const PATCH = withErrorHandler(
  async (
    request: Request,
    context: RouteContext<"/api/asset-code-series/[id]">,
  ) => {
    const actor = await requireCurrentActor(request);
    const { id } = await parseRouteParams(context.params, seriesIdParamsSchema);
    const input = await parseJsonBody(request, seriesUpdateSchema);
    const { assetCodeSeriesService } = createAssetCodeSeriesStack();
    const series = await assetCodeSeriesService.updateSeries(actor, id, input);

    return successResponse(series);
  },
);

export const DELETE = withErrorHandler(
  async (
    request: Request,
    context: RouteContext<"/api/asset-code-series/[id]">,
  ) => {
    const actor = await requireCurrentActor(request);
    const { id } = await parseRouteParams(context.params, seriesIdParamsSchema);
    const { assetCodeSeriesService } = createAssetCodeSeriesStack();
    const series = await assetCodeSeriesService.deleteSeries(actor, id);

    return successResponse(series);
  },
);
