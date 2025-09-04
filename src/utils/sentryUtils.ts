import { sentryErrorService } from '../services/sentryErrorService';
import type { AuthUser } from '../api/supabaseApi';

/**
 * Sentry Utility Functions
 * 
 * Hilfsfunktionen für die Integration von Sentry in die App
 */

/**
 * Setzt den aktuellen User in Sentry basierend auf AuthUser
 */
export const setSentryUser = (user: AuthUser | null): void => {
  if (user) {
    sentryErrorService.setUser({
      id: user.id,
      email: user.email,
      username: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : undefined,
    });
  } else {
    sentryErrorService.clearUser();
  }
};

/**
 * Sendet eine benutzerdefinierte Nachricht an Sentry
 */
export const reportToSentry = (
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: {
    userId?: string;
    listId?: string;
    [key: string]: any;
  }
): void => {
  sentryErrorService.reportMessage(message, level, context);
};

/**
 * Sendet einen API-Fehler an Sentry
 */
export const reportApiError = (
  error: Error | any,
  context: {
    url: string;
    method: string;
    status?: number;
    requestBody?: any;
    responseBody?: any;
    userId?: string;
    listId?: string;
  }
): void => {
  sentryErrorService.reportApiError(error, context);
};

/**
 * Sendet einen Supabase-Fehler an Sentry
 */
export const reportSupabaseError = (
  error: Error | any,
  context: {
    operation: string;
    table?: string;
    userId?: string;
    listId?: string;
  }
): void => {
  sentryErrorService.reportSupabaseError(error, context);
};

/**
 * Sendet einen Queue-Fehler an Sentry
 */
export const reportQueueError = (
  error: Error | any,
  context: {
    queueLength: number;
    requestUrl: string;
    requestMethod: string;
    retryCount: number;
    userId?: string;
  }
): void => {
  sentryErrorService.reportQueueError(error, context);
};

/**
 * Sendet einen Timeout-Fehler an Sentry
 */
export const reportTimeoutError = (
  context: {
    url: string;
    method: string;
    timeout: number;
    userId?: string;
  }
): void => {
  sentryErrorService.reportTimeoutError(context);
};

/**
 * Sendet einen Offline-Fehler an Sentry
 */
export const reportOfflineError = (
  error: Error | any,
  context: {
    action: string;
    requestUrl: string;
    requestMethod: string;
    userId?: string;
  }
): void => {
  sentryErrorService.reportOfflineError(error, context);
};

/**
 * Prüft ob Sentry aktiviert ist
 */
export const isSentryEnabled = (): boolean => {
  return sentryErrorService.isSentryEnabled();
};
