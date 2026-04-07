import { clearSessionCookie } from "@/lib/auth";
import { successResponse } from "@/lib/http/response";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { createAuthStack } from "@/modules/auth/createAuthStack";

export const POST = withErrorHandler(async (request: Request) => {
  const { authService } = createAuthStack();

  await authService.logout(request);

  const response = successResponse({
    loggedOut: true,
  });

  clearSessionCookie(response);

  return response;
});
