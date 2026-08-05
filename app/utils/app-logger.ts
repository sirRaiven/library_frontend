type LogArguments = unknown[];

function enabled(): boolean {
  return import.meta.dev;
}

export const appLogger = {
  debug(...args: LogArguments) {
    if (enabled()) console.debug(...args);
  },
  info(...args: LogArguments) {
    if (enabled()) console.info(...args);
  },
  warn(...args: LogArguments) {
    if (enabled()) console.warn(...args);
  },
  error(...args: LogArguments) {
    if (enabled()) console.error(...args);
  },
};
