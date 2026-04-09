import type { NextRequest } from "next/server";

import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { parseJsonBody } from "@/lib/validators/http";
import { seriesCreateSchema } from "@/lib/validators/asset-code-series";
import { createAssetCodeSeriesStack } from "@/modules/asset-code-series/createAssetCodeSeriesStack";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const actor = await requireCurrentActor(request);
  const { assetCodeSeriesService } = createAssetCodeSeriesStack();
  const series = await assetCodeSeriesService.listSeries(actor);

  return successResponse(series);
});

export const POST = withErrorHandler(async (request: Request) => {
  const actor = await requireCurrentActor(request);
  const input = await parseJsonBody(request, seriesCreateSchema);
  const { assetCodeSeriesService } = createAssetCodeSeriesStack();
  const series = await assetCodeSeriesService.createSeries(actor, input);

  return successResponse(series, { status: 201 });
});
