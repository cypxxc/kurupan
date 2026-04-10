import { getServerAuthProviderMode } from "@/lib/auth-provider";
import { signSessionId, setSessionCookie } from "@/lib/auth";
import { TooManyRequestsError, ValidationError } from "@/lib/errors";
import { successResponse } from "@/lib/http/response";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { consumeRateLimit, getRequestClientIp } from "@/lib/security/rate-limit";
import { createAuthStack } from "@/modules/auth/createAuthStack";

export const POST = withErrorHandler(async (request: Request) => {
  if (getServerAuthProviderMode() === "oidc") {
    throw new ValidationError("Use /api/auth/sso/start when AUTH_PROVIDER=oidc");
  }

  const body = (await request.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };
  const ip = getRequestClientIp(request);
  const rateLimit = consumeRateLimit(`auth:login:${ip}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    throw new TooManyRequestsError("Too many login attempts. Please try again later.", {
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
  }

  const { authService } = createAuthStack();
  const result = await authService.login(body);
  const signedSessionId = await signSessionId(result.sessionId);

  const response = successResponse({
    user: result.user,
  });

  setSessionCookie(response, signedSessionId);

  return response;
});
