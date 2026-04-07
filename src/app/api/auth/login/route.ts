import { signSessionId, setSessionCookie } from "@/lib/auth";
import { successResponse } from "@/lib/http/response";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { createAuthStack } from "@/modules/auth/createAuthStack";

export const POST = withErrorHandler(async (request: Request) => {
  const body = (await request.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };

  const { authService } = createAuthStack();
  const result = await authService.login(body);
  const signedSessionId = await signSessionId(result.sessionId);

  const response = successResponse({
    user: result.user,
  });

  setSessionCookie(response, signedSessionId);

  return response;
});
