import type { NextRequest } from "next/server";

import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { assetCreateSchema, assetListQuerySchema } from "@/lib/validators/assets";
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
  const input = await parseJsonBody(request, assetCreateSchema);
  const { assetService } = createAssetStack();
  const asset = await assetService.createAsset(actor, input);

  return successResponse(asset, { status: 201 });
});
