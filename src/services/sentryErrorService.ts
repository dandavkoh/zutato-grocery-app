import * as Sentry from '@sentry/react';
import { getSentryConfig } from '../config/environment';

/**
 * Sentry Error Service
 * 
 * Zentraler Service für das Senden von Fehlern an Sentry
 * Behandelt API-Fehler, Queue-Fehler und andere Anwendungsfehler
 */
class SentryErrorService {
  private static instance: SentryErrorService | null = null;
  private isEnabled: boolean = false;

  constructor() {
    if (SentryErrorService.instance) {
      return SentryErrorService.instance;
    }
    
    const sentryConfig = getSentryConfig();
    this.isEnabled = sentryConfig.enabled && !!sentryConfig.dsn;
    
    SentryErrorService.instance = this;
  }

  /**
   * Sendet einen API-Fehler an Sentry
   */
  public reportApiError(
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
  ): void {
    if (!this.isEnabled) return;

    Sentry.withScope((scope) => {
      // Setze Tags für bessere Kategorisierung
      scope.setTag('error_type', 'api_error');
      scope.setTag('http_method', context.method);
      scope.setTag('http_status', context.status?.toString() || 'unknown');
      
      // Setze Context für detaillierte Informationen
      scope.setContext('api_request', {
        url: context.url,
        method: context.method,
        status: context.status,
        requestBody: context.requestBody,
        responseBody: context.responseBody,
      });

      // Setze User Context falls verfügbar
      if (context.userId) {
        scope.setUser({ id: context.userId });
      }

      // Setze List Context falls verfügbar
      if (context.listId) {
        scope.setContext('shopping_list', {
          listId: context.listId,
        });
      }

      // Setze Level basierend auf Status Code
      const level = this.getErrorLevel(context.status);
      scope.setLevel(level);

      // Sende den Fehler
      Sentry.captureException(error);
    });
  }

  /**
   * Sendet einen Queue-Fehler an Sentry
   */
  public reportQueueError(
    error: Error | any,
    context: {
      queueLength: number;
      requestUrl: string;
      requestMethod: string;
      retryCount: number;
      userId?: string;
    }
  ): void {
    if (!this.isEnabled) return;

    Sentry.withScope((scope) => {
      scope.setTag('error_type', 'queue_error');
      scope.setTag('queue_length', context.queueLength.toString());
      scope.setTag('retry_count', context.retryCount.toString());
      
      scope.setContext('queue_request', {
        url: context.requestUrl,
        method: context.requestMethod,
        queueLength: context.queueLength,
        retryCount: context.retryCount,
      });

      if (context.userId) {
        scope.setUser({ id: context.userId });
      }

      scope.setLevel('warning');
      Sentry.captureException(error);
    });
  }

  /**
   * Sendet einen Offline-Fehler an Sentry
   */
  public reportOfflineError(
    error: Error | any,
    context: {
      action: string;
      requestUrl: string;
      requestMethod: string;
      userId?: string;
    }
  ): void {
    if (!this.isEnabled) return;

    Sentry.withScope((scope) => {
      scope.setTag('error_type', 'offline_error');
      scope.setTag('action', context.action);
      
      scope.setContext('offline_request', {
        url: context.requestUrl,
        method: context.requestMethod,
        action: context.action,
      });

      if (context.userId) {
        scope.setUser({ id: context.userId });
      }

      scope.setLevel('info');
      Sentry.captureException(error);
    });
  }

  /**
   * Sendet einen Timeout-Fehler an Sentry
   */
  public reportTimeoutError(
    context: {
      url: string;
      method: string;
      timeout: number;
      userId?: string;
    }
  ): void {
    if (!this.isEnabled) return;

    Sentry.withScope((scope) => {
      scope.setTag('error_type', 'timeout_error');
      scope.setTag('timeout_ms', context.timeout.toString());
      
      scope.setContext('timeout_request', {
        url: context.url,
        method: context.method,
        timeout: context.timeout,
      });

      if (context.userId) {
        scope.setUser({ id: context.userId });
      }

      scope.setLevel('warning');
      Sentry.captureMessage(`Request timeout: ${context.method} ${context.url}`, 'warning');
    });
  }

  /**
   * Sendet einen Supabase-spezifischen Fehler an Sentry
   */
  public reportSupabaseError(
    error: Error | any,
    context: {
      operation: string;
      table?: string;
      userId?: string;
      listId?: string;
      itemId?: string;
    }
  ): void {
    if (!this.isEnabled) return;

    Sentry.withScope((scope) => {
      scope.setTag('error_type', 'supabase_error');
      scope.setTag('operation', context.operation);
      
      if (context.table) {
        scope.setTag('table', context.table);
      }

      scope.setContext('supabase_operation', {
        operation: context.operation,
        table: context.table,
      });

      if (context.userId) {
        scope.setUser({ id: context.userId });
      }

      if (context.listId) {
        scope.setContext('shopping_list', {
          listId: context.listId,
        });
      }

      if (context.itemId) {
        scope.setContext('shopping_item', {
          itemId: context.itemId,
        });
      }

      scope.setLevel('error');
      Sentry.captureException(error);
    });
  }

  /**
   * Sendet eine benutzerdefinierte Nachricht an Sentry
   */
  public reportMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    context?: {
      userId?: string;
      listId?: string;
      [key: string]: any;
    }
  ): void {
    if (!this.isEnabled) return;

    Sentry.withScope((scope) => {
      if (context) {
        Object.keys(context).forEach(key => {
          if (key === 'userId' && context.userId) {
            scope.setUser({ id: context.userId });
          } else if (key === 'listId' && context.listId) {
            scope.setContext('shopping_list', {
              listId: context.listId,
            });
          } else {
            scope.setContext(key, context[key]);
          }
        });
      }

      scope.setLevel(level);
      Sentry.captureMessage(message, level);
    });
  }

  /**
   * Setzt den aktuellen User für alle nachfolgenden Sentry-Events
   */
  public setUser(user: { id: string; email?: string; username?: string }): void {
    if (!this.isEnabled) return;
    Sentry.setUser(user);
  }

  /**
   * Entfernt den aktuellen User
   */
  public clearUser(): void {
    if (!this.isEnabled) return;
    Sentry.setUser(null);
  }

  /**
   * Bestimmt das Error-Level basierend auf HTTP-Status
   */
  private getErrorLevel(status?: number): 'info' | 'warning' | 'error' {
    if (!status) return 'error';
    
    if (status >= 500) return 'error';      // Server-Fehler
    if (status >= 400) return 'warning';    // Client-Fehler
    if (status >= 300) return 'info';       // Redirects
    return 'info';                          // Success
  }

  /**
   * Prüft ob Sentry aktiviert ist
   */
  public isSentryEnabled(): boolean {
    return this.isEnabled;
  }
}

// Export singleton instance
export const sentryErrorService = new SentryErrorService();
