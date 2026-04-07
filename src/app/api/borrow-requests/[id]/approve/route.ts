import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import {
  borrowRequestApproveSchema,
  borrowRequestIdParamsSchema,
} from "@/lib/validators/borrow-requests";
import { parseOptionalJsonBody, parseRouteParams } from "@/lib/validators/http";
import { createBorrowStack } from "@/modules/borrow/createBorrowStack";

export const POST = withErrorHandler(
  async (
    request: Request,
    context: RouteContext<"/api/borrow-requests/[id]/approve">,
  ) => {
    const actor = await requireCurrentActor(request);
    const { id } = await parseRouteParams(context.params, borrowRequestIdParamsSchema);
    const input = await parseOptionalJsonBody(request, borrowRequestApproveSchema);
    const { borrowRequestService } = createBorrowStack();
    const borrowRequest = await borrowRequestService.approveBorrowRequest(actor, id, input);

    return successResponse(borrowRequest);
  },
);
