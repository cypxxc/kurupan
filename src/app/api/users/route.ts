import type { NextRequest } from "next/server";

import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { parseJsonBody, parseSearchParams } from "@/lib/validators/http";
import { userCreateSchema, userListQuerySchema } from "@/lib/validators/users";
import { createUserManagementStack } from "@/modules/users/createUserManagementStack";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const actor = await requireCurrentActor(request);
  const filters = parseSearchParams(request, userListQuerySchema);
  const { userManagementService } = createUserManagementStack();
  const users = await userManagementService.listUsers(actor, filters);

  return successResponse(users);
});

export const POST = withErrorHandler(async (request: Request) => {
  const actor = await requireCurrentActor(request);
  const input = await parseJsonBody(request, userCreateSchema);
  const { userManagementService } = createUserManagementStack();
  const user = await userManagementService.createUser(actor, input);

  return successResponse(user, { status: 201 });
});
