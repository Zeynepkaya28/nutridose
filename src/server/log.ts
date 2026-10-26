// Structured server logs. Never log request bodies or health data; only ids, steps and error summaries.
export interface Logger {
  info(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
  child(fields: Record<string, unknown>): Logger;
}

function summarize(value: unknown): unknown {
  if (value instanceof Error) {
    const code = (value as { code?: unknown }).code;
    return { name: value.name, message: value.message, ...(code ? { code } : {}) };
  }
  return value;
}

export function createLogger(base: Record<string, unknown> = {}): Logger {
  const write = (level: "info" | "error", message: string, fields: Record<string, unknown> = {}) => {
    const entry: Record<string, unknown> = { level, message, time: new Date().toISOString(), ...base };
    for (const [key, value] of Object.entries(fields)) entry[key] = summarize(value);
    (level === "error" ? console.error : console.info)(JSON.stringify(entry));
  };
  return {
    info: (message, fields) => write("info", message, fields),
    error: (message, fields) => write("error", message, fields),
    child: (fields) => createLogger({ ...base, ...fields }),
  };
}
