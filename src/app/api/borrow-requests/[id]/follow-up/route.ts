import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { borrowRequestIdParamsSchema } from "@/lib/validators/borrow-requests";
import { parseRouteParams } from "@/lib/validators/http";
import { createBorrowStack } from "@/modules/borrow/createBorrowStack";

export const POST = withErrorHandler(
  async (
    request: Request,
    context: RouteContext<"/api/borrow-requests/[id]/follow-up">,
  ) => {
    const actor = await requireCurrentActor(request);
    const { id } = await parseRouteParams(context.params, borrowRequestIdParamsSchema);
    const { borrowRequestService } = createBorrowStack();
    const borrowRequest = await borrowRequestService.createFollowUpBorrowRequest(actor, id);

    return successResponse(borrowRequest, { status: 201 });
  },
);
