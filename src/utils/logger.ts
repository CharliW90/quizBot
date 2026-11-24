import { pino } from "pino";

const isProduction = process.env.NODE_ENV === "production";

const severityLookup: Record<string, string> = {
  trace: "DEBUG",
  debug: "DEBUG",
  info: "INFO",
  warn: "WARNING",
  error: "ERROR",
  fatal: "CRITICAL",
};

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  messageKey: isProduction ? "message" : "msg",
  serializers: {
    error: pino.stdSerializers.err,
  },
  formatters: isProduction
    ? {
        level(label, number) {
          return { severity: severityLookup[label] ?? "INFO", level: number };
        },
      }
    : undefined,
  transport: !isProduction
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
});
