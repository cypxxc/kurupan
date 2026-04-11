import { AppError } from "@/lib/errors";
import { errorResponse } from "@/lib/http/response";
import { defaultLocale } from "@/lib/i18n/config";
import { getRequestLocale } from "@/lib/i18n/server";
import { logger } from "@/lib/logger";
import {
  getSlowOperationThresholdMs,
  isPerformanceInstrumentationEnabled,
} from "@/lib/performance";
import { assertTrustedMutationRequest } from "@/lib/security/request-origin";

import { localizeErrorDetails, localizeErrorMessage } from "./error-localization";

function getRequestFromArgs(args: unknown[]) {
  const [firstArg] = args;

  return firstArg instanceof Request ? firstArg : null;
}

function getRequestMetadata(request: Request | null) {
  if (!request) {
    return {
      method: "UNKNOWN",
      path: "unknown",
      requestId: undefined,
    };
  }

  const url = new URL(request.url);

  return {
    method: request.method,
    path: url.pathname,
    requestId: request.headers.get("x-vercel-id") ?? undefined,
  };
}

function attachPerformanceHeaders(response: Response, durationMs: number, requestId?: string) {
  response.headers.set("Server-Timing", `app;dur=${durationMs}`);

  if (requestId) {
    response.headers.set("X-Request-Id", requestId);
  }

  return response;
}

export function withErrorHandler<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response> | Response,
) {
  return async (...args: TArgs) => {
    const startedAt = Date.now();
    const request = getRequestFromArgs(args);
    const requestMetadata = getRequestMetadata(request);
    const slowThresholdMs = getSlowOperationThresholdMs();

    try {
      if (request) {
        assertTrustedMutationRequest(request);
      }

      const response = await handler(...args);
      const durationMs = Date.now() - startedAt;
      const shouldHighlightSlowRequest =
        isPerformanceInstrumentationEnabled() && durationMs >= slowThresholdMs;

      (shouldHighlightSlowRequest ? logger.warn : logger.info)("Handled request", {
        ...requestMetadata,
        statusCode: response.status,
        durationMs,
        slowThresholdMs: shouldHighlightSlowRequest ? slowThresholdMs : undefined,
      });

      return attachPerformanceHeaders(response, durationMs, requestMetadata.requestId);
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const locale = await getRequestLocale().catch(() => defaultLocale);

      if (error instanceof AppError) {
        logger.warn("Handled request error", {
          ...requestMetadata,
          code: error.code,
          statusCode: error.statusCode,
          message: error.message,
          details: error.details,
          durationMs,
        });

        return errorResponse(
          {
            code: error.code,
            message: localizeErrorMessage(error, locale),
            details: localizeErrorDetails(error.details, locale),
          },
          {
            status: error.statusCode,
            headers: {
              ...Object.fromEntries(new Headers(error.headers ?? {}).entries()),
              "Server-Timing": `app;dur=${durationMs}`,
              ...(requestMetadata.requestId
                ? { "X-Request-Id": requestMetadata.requestId }
                : {}),
            },
          },
        );
      }

      logger.error("Unhandled request error", {
        ...requestMetadata,
        error,
        durationMs,
      });

      return errorResponse(
        {
          code: "INTERNAL_SERVER_ERROR",
          message: localizeErrorMessage(
            {
              code: "INTERNAL_SERVER_ERROR",
              message: "An unexpected error occurred",
            },
            locale,
          ),
        },
        {
          status: 500,
          headers: {
            "Server-Timing": `app;dur=${durationMs}`,
            ...(requestMetadata.requestId
              ? { "X-Request-Id": requestMetadata.requestId }
              : {}),
          },
        },
      );
    }
  };
}
