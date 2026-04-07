import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { parseJsonBody, parseRouteParams } from "@/lib/validators/http";
import { userIdParamsSchema, userUpdateSchema } from "@/lib/validators/users";
import { createUserManagementStack } from "@/modules/users/createUserManagementStack";

export const GET = withErrorHandler(
  async (
    request: Request,
    context: RouteContext<"/api/users/[id]">,
  ) => {
    const actor = await requireCurrentActor(request);
    const { id } = await parseRouteParams(context.params, userIdParamsSchema);
    const { userManagementService } = createUserManagementStack();
    const user = await userManagementService.getUserById(actor, id);

    return successResponse(user);
  },
);

export const PATCH = withErrorHandler(
  async (
    request: Request,
    context: RouteContext<"/api/users/[id]">,
  ) => {
    const actor = await requireCurrentActor(request);
    const { id } = await parseRouteParams(context.params, userIdParamsSchema);
    const input = await parseJsonBody(request, userUpdateSchema);
    const { userManagementService } = createUserManagementStack();
    const user = await userManagementService.updateUser(actor, id, input);

    return successResponse(user);
  },
);
