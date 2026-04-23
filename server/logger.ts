import pino from "pino";
import pinoHttp from "pino-http";

const isDev = process.env.NODE_ENV === "development";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
});

export const httpLogger = pinoHttp({
  logger,
  // Only log API routes
  autoLogging: {
    ignore: (req) => !req.url?.startsWith("/api"),
  },
  // Sanitize sensitive fields from request/response logs
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", 'res.headers["set-cookie"]'],
    censor: "[REDACTED]",
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
      };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
});

export function audit(
  action: string,
  actorId: string | undefined,
  details: Record<string, unknown> = {}
) {
  logger.info({ audit: true, action, actorId: actorId ?? "anonymous", ...details });
}
