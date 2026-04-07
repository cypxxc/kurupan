import { successResponse } from "@/lib/http/response";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { createAuthStack } from "@/modules/auth/createAuthStack";

export const GET = withErrorHandler(async (request: Request) => {
  const { authService } = createAuthStack();
  const actor = await authService.getCurrentUser(request);

  return successResponse({
    user: actor,
  });
});
