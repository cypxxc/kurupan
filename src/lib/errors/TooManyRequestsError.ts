import { AppError } from "./AppError";

type TooManyRequestsOptions = {
  details?: unknown;
  retryAfterSeconds?: number;
};

function resolveDetails(options?: TooManyRequestsOptions) {
  if (!options) {
    return undefined;
  }

  if (options.retryAfterSeconds === undefined) {
    return options.details;
  }

  if (
    options.details &&
    typeof options.details === "object" &&
    !Array.isArray(options.details)
  ) {
    return {
      ...(options.details as Record<string, unknown>),
      retryAfterSeconds: options.retryAfterSeconds,
    };
  }

  return {
    details: options.details,
    retryAfterSeconds: options.retryAfterSeconds,
  };
}

function resolveHeaders(options?: TooManyRequestsOptions) {
  if (options?.retryAfterSeconds === undefined) {
    return undefined;
  }

  return {
    "Retry-After": String(options.retryAfterSeconds),
  };
}

export class TooManyRequestsError extends AppError {
  constructor(
    message = "Too many requests. Please try again later.",
    options?: TooManyRequestsOptions,
  ) {
    super(
      message,
      "TOO_MANY_REQUESTS",
      429,
      resolveDetails(options),
      resolveHeaders(options),
    );
  }
}
