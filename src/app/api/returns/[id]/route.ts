import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { parseJsonBody, parseRouteParams } from "@/lib/validators/http";
import { returnIdParamsSchema, returnUpdateSchema } from "@/lib/validators/returns";
import { createReturnStack } from "@/modules/returns/createReturnStack";

export const GET = withErrorHandler(
  async (
    request: Request,
    context: RouteContext<"/api/returns/[id]">,
  ) => {
    const actor = await requireCurrentActor(request);
    const { id } = await parseRouteParams(context.params, returnIdParamsSchema);
    const { returnService } = createReturnStack();
    const returnTransaction = await returnService.getReturnById(actor, id);

    return successResponse(returnTransaction);
  },
);

export const PATCH = withErrorHandler(
  async (
    request: Request,
    context: RouteContext<"/api/returns/[id]">,
  ) => {
    const actor = await requireCurrentActor(request);
    const { id } = await parseRouteParams(context.params, returnIdParamsSchema);
    const input = await parseJsonBody(request, returnUpdateSchema);
    const { returnService } = createReturnStack();
    const returnTransaction = await returnService.updateReturn(actor, id, input);

    return successResponse(returnTransaction);
  },
);
