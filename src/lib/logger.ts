type LogPayload = Record<string, unknown>;

function log(level: "info" | "warn" | "error", message: string, payload?: LogPayload): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const metadata = payload ? ` ${JSON.stringify(payload)}` : "";
  if (level === "error") {
    console.error(`[heatmap:${level}] ${message}${metadata}`);
    return;
  }

  if (level === "warn") {
    console.warn(`[heatmap:${level}] ${message}${metadata}`);
    return;
  }

  console.info(`[heatmap:${level}] ${message}${metadata}`);
}

export const logger = {
  info: (message: string, payload?: LogPayload) => log("info", message, payload),
  warn: (message: string, payload?: LogPayload) => log("warn", message, payload),
  error: (message: string, payload?: LogPayload) => log("error", message, payload),
};
