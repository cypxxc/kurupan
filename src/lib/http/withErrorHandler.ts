import { AppError } from "@/lib/errors";
import { errorResponse } from "@/lib/http/response";
import { defaultLocale } from "@/lib/i18n/config";
import { getRequestLocale } from "@/lib/i18n/server";
import { logger } from "@/lib/logger";

import { localizeErrorDetails, localizeErrorMessage } from "./error-localization";

export function withErrorHandler<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response> | Response,
) {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (error) {
      const locale = await getRequestLocale().catch(() => defaultLocale);

      if (error instanceof AppError) {
        logger.warn("Handled request error", {
          code: error.code,
          statusCode: error.statusCode,
          message: error.message,
          details: error.details,
        });

        return errorResponse(
          {
            code: error.code,
            message: localizeErrorMessage(error, locale),
            details: localizeErrorDetails(error.details, locale),
          },
          {
            status: error.statusCode,
            headers: error.headers,
          },
        );
      }

      logger.error("Unhandled request error", { error });

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
        { status: 500 },
      );
    }
  };
}
