import { requireCurrentActor } from "@/lib/http/request-context";
import { successResponse } from "@/lib/http/response";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { getCachedAssetFieldOptions } from "@/modules/assets/asset-field-options-cache";

export const GET = withErrorHandler(async (request: Request) => {
  await requireCurrentActor(request);
  return successResponse(await getCachedAssetFieldOptions());
});
