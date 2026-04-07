type LogLevel = "debug" | "info" | "warn" | "error";

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "password_hash",
  "session",
  "sessionId",
  "session_id",
  "cookie",
  "cookies",
  "secret",
  "authorization",
]);

function sanitizeLogValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeLogValue);
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
      key,
      SENSITIVE_KEYS.has(key) ? "[REDACTED]" : sanitizeLogValue(entryValue),
    ]);

    return Object.fromEntries(entries);
  }

  return value;
}

function writeLog(level: LogLevel, message: string, context?: unknown) {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context: sanitizeLogValue(context),
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const logger = {
  debug(message: string, context?: unknown) {
    writeLog("debug", message, context);
  },
  info(message: string, context?: unknown) {
    writeLog("info", message, context);
  },
  warn(message: string, context?: unknown) {
    writeLog("warn", message, context);
  },
  error(message: string, context?: unknown) {
    writeLog("error", message, context);
  },
};
