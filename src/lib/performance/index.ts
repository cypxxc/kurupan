import { logger } from "@/lib/logger";

const DEFAULT_SLOW_OPERATION_THRESHOLD_MS = 750;

function parseBooleanEnv(value: string | undefined) {
  if (!value) {
    return false;
  }

  return value === "1" || value.toLowerCase() === "true";
}

export function isPerformanceInstrumentationEnabled() {
  return parseBooleanEnv(process.env.PERF_INSTRUMENTATION_ENABLED);
}

export function getSlowOperationThresholdMs() {
  const rawValue = Number(process.env.PERF_SLOW_OPERATION_THRESHOLD_MS);

  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return DEFAULT_SLOW_OPERATION_THRESHOLD_MS;
  }

  return rawValue;
}

type MeasureAsyncOperationOptions = {
  context?: Record<string, unknown>;
  slowThresholdMs?: number;
};

export async function measureAsyncOperation<T>(
  operation: string,
  callback: () => Promise<T>,
  options: MeasureAsyncOperationOptions = {},
) {
  if (!isPerformanceInstrumentationEnabled()) {
    return callback();
  }

  const startedAt = Date.now();
  const slowThresholdMs = options.slowThresholdMs ?? getSlowOperationThresholdMs();

  try {
    const result = await callback();
    const durationMs = Date.now() - startedAt;
    const message =
      durationMs >= slowThresholdMs ? "Slow async operation detected" : "Measured async operation";
    const log = durationMs >= slowThresholdMs ? logger.warn : logger.debug;

    log(message, {
      operation,
      durationMs,
      slowThresholdMs,
      ...options.context,
    });

    return result;
  } catch (error) {
    logger.error("Async operation failed", {
      operation,
      durationMs: Date.now() - startedAt,
      slowThresholdMs,
      error,
      ...options.context,
    });

    throw error;
  }
}
