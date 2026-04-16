const isDev = import.meta.env.DEV;
const debugEnabled = import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true' || isDev;

export const logDebug = (...args: any[]) => {
  if (debugEnabled) {
    console.log(...args);
  }
};

export const logInfo = (...args: any[]) => {
  console.info(...args);
};

export const logWarn = (...args: any[]) => {
  console.warn(...args);
};

export const logError = (...args: any[]) => {
  console.error(...args);
};
