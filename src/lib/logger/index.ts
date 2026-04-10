import { sanitizeSensitiveData } from "@/lib/security/sanitize";

type LogLevel = "debug" | "info" | "warn" | "error";

function writeLog(level: LogLevel, message: string, context?: unknown) {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context: sanitizeSensitiveData(context),
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
