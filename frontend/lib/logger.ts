const isDev = process.env.NODE_ENV === "development";

export const log = {
  debug(...args: unknown[]) {
    if (isDev) console.debug("[scout]", ...args);
  },
  warn(...args: unknown[]) {
    if (isDev) console.warn("[scout]", ...args);
  },
  error(...args: unknown[]) {
    console.error("[scout]", ...args);
  },
};
