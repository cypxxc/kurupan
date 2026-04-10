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
  "token",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
]);

export function sanitizeSensitiveData(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeSensitiveData);
  }

  if (value instanceof Date) {
    return value.toISOString();
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
      SENSITIVE_KEYS.has(key) ? "[REDACTED]" : sanitizeSensitiveData(entryValue),
    ]);

    return Object.fromEntries(entries);
  }

  return value;
}
