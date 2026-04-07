import type { NextRequest } from "next/server";

import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import {
  borrowRequestCreateSchema,
  borrowRequestListQuerySchema,
} from "@/lib/validators/borrow-requests";
import { parseJsonBody, parseSearchParams } from "@/lib/validators/http";
import { createBorrowStack } from "@/modules/borrow/createBorrowStack";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const actor = await requireCurrentActor(request);
  const filters = parseSearchParams(request, borrowRequestListQuerySchema);
  const { borrowRequestService } = createBorrowStack();
  const borrowRequests = await borrowRequestService.listBorrowRequests(actor, filters);

  return successResponse(borrowRequests);
});

export const POST = withErrorHandler(async (request: Request) => {
  const actor = await requireCurrentActor(request);
  const input = await parseJsonBody(request, borrowRequestCreateSchema);
  const { borrowRequestService } = createBorrowStack();
  const borrowRequest = await borrowRequestService.createBorrowRequest(actor, input);

  return successResponse(borrowRequest, { status: 201 });
});
