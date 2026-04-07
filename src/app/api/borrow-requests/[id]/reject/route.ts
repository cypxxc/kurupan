import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { borrowRequestRejectSchema } from "@/lib/validators/borrow-request-actions";
import { borrowRequestIdParamsSchema } from "@/lib/validators/borrow-requests";
import { parseJsonBody, parseRouteParams } from "@/lib/validators/http";
import { createBorrowStack } from "@/modules/borrow/createBorrowStack";

export const POST = withErrorHandler(
  async (
    request: Request,
    context: RouteContext<"/api/borrow-requests/[id]/reject">,
  ) => {
    const actor = await requireCurrentActor(request);
    const { id } = await parseRouteParams(context.params, borrowRequestIdParamsSchema);
    const input = await parseJsonBody(request, borrowRequestRejectSchema);
    const { borrowRequestService } = createBorrowStack();
    const borrowRequest = await borrowRequestService.rejectBorrowRequest(actor, id, input);

    return successResponse(borrowRequest);
  },
);
