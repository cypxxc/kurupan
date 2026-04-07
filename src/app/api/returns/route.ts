import type { NextRequest } from "next/server";

import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { parseJsonBody, parseSearchParams } from "@/lib/validators/http";
import { returnCreateSchema, returnListQuerySchema } from "@/lib/validators/returns";
import { createReturnStack } from "@/modules/returns/createReturnStack";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const actor = await requireCurrentActor(request);
  const filters = parseSearchParams(request, returnListQuerySchema);
  const { returnService } = createReturnStack();
  const returns = await returnService.listReturns(actor, filters);

  return successResponse(returns);
});

export const POST = withErrorHandler(async (request: Request) => {
  const actor = await requireCurrentActor(request);
  const input = await parseJsonBody(request, returnCreateSchema);
  const { returnService } = createReturnStack();
  const returnTransaction = await returnService.createReturn(actor, input);

  return successResponse(returnTransaction, { status: 201 });
});
