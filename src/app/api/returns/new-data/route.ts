import type { NextRequest } from "next/server";

import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { parseSearchParams } from "@/lib/validators/http";
import { returnPreparationQuerySchema } from "@/lib/validators/returns";
import { createReturnStack } from "@/modules/returns/createReturnStack";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const actor = await requireCurrentActor(request);
  const filters = parseSearchParams(request, returnPreparationQuerySchema);
  const { returnService } = createReturnStack();
  const data = await returnService.getReturnPreparationData(actor, filters.borrowRequestId);

  return successResponse(data);
});
