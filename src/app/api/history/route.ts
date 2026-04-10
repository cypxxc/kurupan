import type { NextRequest } from "next/server";

import { hasPaginationQuery } from "@/lib/pagination";
import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { parseSearchParams } from "@/lib/validators/http";
import { historyListQuerySchema } from "@/lib/validators/history";
import { createHistoryStack } from "@/modules/history/createHistoryStack";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const actor = await requireCurrentActor(request);
  const filters = parseSearchParams(request, historyListQuerySchema);
  const { historyService } = createHistoryStack();
  const history = hasPaginationQuery(filters)
    ? await historyService.listHistoryPage(actor, filters)
    : await historyService.listHistory(actor, filters);

  return successResponse(history);
});
