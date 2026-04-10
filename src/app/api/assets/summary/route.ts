import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { createAssetStack } from "@/modules/assets/createAssetStack";

export const GET = withErrorHandler(async (request: Request) => {
  await requireCurrentActor(request);
  const { assetService } = createAssetStack();
  const summary = await assetService.getDashboardSummary();

  return successResponse(summary);
});
