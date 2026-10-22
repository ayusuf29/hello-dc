export interface LogContext {
  requestId?: string;
  path?: string;
  method?: string;
  userId?: string;
  role?: string;
  [key: string]: unknown;
}

const REDACT_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "rawtoken",
  "sessionsecret",
  "invitecode",
  "codehash",
  "accesstoken",
  "accesstokenhash",
  "secret",
  "authorization",
  "cookie",
]);

function redact(data: unknown): unknown {
  if (!data || typeof data !== "object") {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(redact);
  }
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (REDACT_KEYS.has(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = redact(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export const logger = {
  info(message: string, context?: LogContext) {
    console.log(
      JSON.stringify({
        level: "info",
        timestamp: new Date().toISOString(),
        message,
        context: context ? redact(context) : undefined,
      })
    );
  },
  warn(message: string, context?: LogContext) {
    console.warn(
      JSON.stringify({
        level: "warn",
        timestamp: new Date().toISOString(),
        message,
        context: context ? redact(context) : undefined,
      })
    );
  },
  error(message: string, error?: unknown, context?: LogContext) {
    console.error(
      JSON.stringify({
        level: "error",
        timestamp: new Date().toISOString(),
        message,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: process.env.NODE_ENV === "development" ? error.stack : undefined }
            : error,
        context: context ? redact(context) : undefined,
      })
    );
  },
};
