const isProd = process.env.NODE_ENV === "production";

export const logger = {
  debug: (...args: unknown[]): void => {
    if (!isProd) console.debug(...args);
  },
  info: (...args: unknown[]): void => {
    if (!isProd) console.info(...args);
  },
  warn: (...args: unknown[]): void => {
    console.warn(...args);
  },
  error: (...args: unknown[]): void => {
    console.error(...args);
  },
};
