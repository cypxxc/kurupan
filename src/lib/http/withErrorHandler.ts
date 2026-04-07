import { AppError } from "@/lib/errors";
import { errorResponse } from "@/lib/http/response";
import { logger } from "@/lib/logger";

export function withErrorHandler<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response> | Response,
) {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (error) {
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
            message: error.message,
            details: error.details,
          },
          { status: error.statusCode },
        );
      }

      logger.error("Unhandled request error", { error });

      return errorResponse(
        {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        },
        { status: 500 },
      );
    }
  };
}
