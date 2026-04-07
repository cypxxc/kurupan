import type { NextRequest } from "next/server";

import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { parseSearchParams } from "@/lib/validators/http";
import { legacyUserSearchQuerySchema } from "@/lib/validators/users";
import { createUserManagementStack } from "@/modules/users/createUserManagementStack";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const actor = await requireCurrentActor(request);
  const query = parseSearchParams(request, legacyUserSearchQuerySchema);
  const { userManagementService } = createUserManagementStack();
  const users = await userManagementService.searchLegacyUsers(actor, query);

  return successResponse(users);
});
