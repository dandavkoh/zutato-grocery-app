import { dexieService, type QueuedRequest, type RollbackData } from './dexieService';
import { sentryErrorService } from './sentryErrorService';
import { NetworkMonitor } from '../utils/networkUtils';
import { logDebug, logInfo, logWarn, logError } from '../utils/logger';

export interface QueueStatus {
  queueLength: number;
  isProcessing: boolean;
}

// Callback type for post-sync notifications
type PostSyncCallback = () => void;

class GlobalQueueService {
  private queueStatus: QueueStatus = { queueLength: 0, isProcessing: false };
  private processingLock: Promise<void> | null = null;
  private readonly MAX_QUEUE_SIZE = 5000;
  private readonly MAX_RETRY_COUNT = 5;
  private readonly INITIAL_BACKOFF_MS = 1000; // 1 second
  private readonly MAX_BACKOFF_MS = 60000; // 60 seconds
  private static instance: GlobalQueueService | null = null;
  private static isInitialized = false;
  private postSyncCallbacks: Set<PostSyncCallback> = new Set();
  private processingInterval: NodeJS.Timeout | null = null;
  
  // Event handler references for cleanup
  private handleVisibilityChange = async () => {
    try {
      if (!document.hidden) {
        logDebug('👁️ [GlobalQueue] App became visible, checking queue status');
        this.loadQueueFromDexie();
        const isOnline = await NetworkMonitor.isOnline();
        if (isOnline && this.queueStatus.queueLength > 0) {
          logDebug('🔄 [GlobalQueue] App visible and online, processing queued requests');
          this.processQueuedRequestsInternal();
        }
      }
    } catch (error) {
      logError('❌ [GlobalQueue] Error in visibility change handler:', error);
      sentryErrorService.reportApiError(error, { context: 'handleVisibilityChange' });
    }
  };

  private handleFocus = async () => {
    try {
      logDebug('🎯 [GlobalQueue] Window focused, checking queue status');
      this.loadQueueFromDexie();
      const isOnline = await NetworkMonitor.isOnline();
      if (isOnline && this.queueStatus.queueLength > 0) {
        logDebug('🔄 [GlobalQueue] Window focused and online, processing queued requests');
        this.processQueuedRequestsInternal();
      }
    } catch (error) {
      logError('❌ [GlobalQueue] Error in focus handler:', error);
      sentryErrorService.reportApiError(error, { context: 'handleFocus' });
    }
  };

  private handleOnline = async () => {
    try {
      logInfo('🌐 [GlobalQueue] Online, processing queued requests');
      await this.processQueuedRequestsInternal();
      
      // Notify listeners that sync is complete and they should refresh data
      logDebug('📢 [GlobalQueue] Notifying post-sync callbacks', { count: this.postSyncCallbacks.size });
      this.postSyncCallbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          logError('❌ [GlobalQueue] Post-sync callback error:', error);
          sentryErrorService.reportApiError(error, { context: 'postSyncCallback' });
        }
      });
    } catch (error) {
      logError('❌ [GlobalQueue] Error in online event handler:', error);
      sentryErrorService.reportApiError(error, { context: 'handleOnline' });
    }
  };

  private handleOffline = () => {
    logInfo('📴 [GlobalQueue] Offline');
  };

  private notifyFailedRequest(request: QueuedRequest): void {
    const message = request.rollbackData 
      ? `Failed to sync ${request.rollbackData.operation} on ${request.rollbackData.tableName}. Changes have been reverted.`
      : `Request permanently failed: ${request.method} ${request.url}`;
      
    logWarn('⚠️ [GlobalQueue]', message);
    
    // Could integrate with a toast notification system here
    // toast.warning(message);
  }

  private async rollbackRequest(request: QueuedRequest): Promise<void> {
    if (!request.rollbackData) {
      logDebug('ℹ️ [GlobalQueue] No rollback data available for request:', request.id);
      return;
    }

    const { operation, tableName, recordId, previousState } = request.rollbackData;
    
    try {
      logDebug(`🔄 [GlobalQueue] Rolling back ${operation} on ${tableName}:`, recordId);
      
      switch (tableName) {
        case 'shoppingItems':
          if (operation === 'create') {
            // Delete the optimistically created item
            await dexieService.deleteShoppingItemLocal(recordId);
            logDebug(`✅ [GlobalQueue] Rolled back created item: ${recordId}`);
          } else if (operation === 'update' && previousState && 'list_id' in previousState) {
            // Restore previous state - type guard ensures it's a ShoppingItem
            await dexieService.updateShoppingItem(previousState);
            logDebug(`✅ [GlobalQueue] Rolled back updated item: ${recordId}`);
          } else if (operation === 'delete' && previousState && 'list_id' in previousState) {
            // Restore deleted item - type guard ensures it's a ShoppingItem
            await dexieService.addShoppingItem(previousState);
            logDebug(`✅ [GlobalQueue] Rolled back deleted item: ${recordId}`);
          }
          break;
          
        case 'lists':
          if (operation === 'create') {
            // Remove the optimistically created list
            await dexieService.deleteList(recordId);
            logDebug(`✅ [GlobalQueue] Rolled back created list: ${recordId}`);
          } else if (operation === 'update' && previousState && 'description' in previousState) {
            // Restore previous list state - type guard ensures it's a List
            await dexieService.updateList(previousState);
            logDebug(`✅ [GlobalQueue] Rolled back updated list: ${recordId}`);
          } else if (operation === 'delete' && previousState && 'description' in previousState) {
            // Restore deleted list - type guard ensures it's a List
            await dexieService.addList(previousState);
            logDebug(`✅ [GlobalQueue] Rolled back deleted list: ${recordId}`);
          }
          break;
          
        // Categories and units typically aren't user-editable, but adding for completeness
        case 'categories':
        case 'units':
          logDebug(`ℹ️ [GlobalQueue] Rollback for ${tableName} not implemented`);
          break;
      }
      
      logDebug('✅ [GlobalQueue] Rollback completed for request:', request.id);
    } catch (error) {
      logError('❌ [GlobalQueue] Failed to rollback request:', error);
      sentryErrorService.reportApiError(error, {
        context: 'rollbackRequest',
        requestId: request.id,
        operation,
        tableName
      });
    }
  }

  private handleLoad = () => {
    try {
      logDebug('📄 [GlobalQueue] Page loaded, checking queue status');
      this.loadQueueFromDexie();
      NetworkMonitor.isOnline().then(isOnline => {
        if (isOnline && this.queueStatus.queueLength > 0) {
          logDebug('🔄 [GlobalQueue] Page loaded and online, processing queued requests');
          this.processQueuedRequestsInternal();
        }
      });
    } catch (error) {
      logError('❌ [GlobalQueue] Error in load handler:', error);
      sentryErrorService.reportApiError(error, { context: 'handleLoad' });
    }
  };

  private handleBeforeUnload = () => {
    logDebug('🚪 [GlobalQueue] Page unloading, queue remains persistent');
  };

  constructor() {
    if (GlobalQueueService.instance) {
      return GlobalQueueService.instance;
    }
    
    if (GlobalQueueService.isInitialized) {
      return GlobalQueueService.instance!;
    }
    
    GlobalQueueService.instance = this;
    GlobalQueueService.isInitialized = true;
    this.initialize();
  }

  private initialize() {
    logDebug('🔧 [GlobalQueue] Initializing global queue service...');
    
    // Set up event listeners for app lifecycle
    this.setupAppLifecycleListeners();
    
    // Load queue from Dexie
    this.loadQueueFromDexie();
    
    logDebug('✅ [GlobalQueue] Global queue service initialized');
  }

  /**
   * Calculate exponential backoff delay based on retry count
   * Formula: min(INITIAL_BACKOFF * 2^retryCount, MAX_BACKOFF)
   */
  private calculateBackoffDelay(retryCount: number): number {
    const delay = Math.min(
      this.INITIAL_BACKOFF_MS * Math.pow(2, retryCount),
      this.MAX_BACKOFF_MS
    );
    return delay;
  }

  /**
   * Check if enough time has passed since last attempt for retry
   */
  private canRetryRequest(request: QueuedRequest): boolean {
    const now = Date.now();
    const backoffDelay = this.calculateBackoffDelay(request.retryCount);
    const timeSinceLastAttempt = now - request.lastAttempt;
    
    if (timeSinceLastAttempt < backoffDelay) {
      const remainingTime = Math.ceil((backoffDelay - timeSinceLastAttempt) / 1000);
      logDebug(`⏳ [GlobalQueue] Request ${request.id} needs to wait ${remainingTime}s more (backoff: ${backoffDelay}ms, retry: ${request.retryCount})`);
      return false;
    }
    
    return true;
  }

  private setupAppLifecycleListeners() {
    // Listen for visibility changes (tab switching, app backgrounding)
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Listen for focus events (window focus)
    window.addEventListener('focus', this.handleFocus);

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Listen for page load events
    window.addEventListener('load', this.handleLoad);

    // Listen for beforeunload to ensure queue is persisted
    window.addEventListener('beforeunload', this.handleBeforeUnload);

    // Periodic queue processing (every 30 seconds when online)
    this.processingInterval = setInterval(async () => {
      const isOnline = await NetworkMonitor.isOnline();
      if (isOnline && this.queueStatus.queueLength > 0 && !this.queueStatus.isProcessing) {
        logDebug('⏰ [GlobalQueue] Periodic queue check, processing queued requests');
        this.processQueuedRequestsInternal();
      }
    }, 30000);
  }

  /**
   * Clean up event listeners and intervals to prevent memory leaks
   */
  public destroy(): void {
    logDebug('🧹 [GlobalQueue] Cleaning up event listeners and intervals...');
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('focus', this.handleFocus);
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    window.removeEventListener('load', this.handleLoad);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    
    // Clear interval
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    // Clear callbacks
    this.postSyncCallbacks.clear();
    
    logDebug('✅ [GlobalQueue] Cleanup completed');
  }

  private async queueRequest(request: Request, rollbackData?: RollbackData): Promise<void> {
    // Check queue size limit
    const currentCount = await dexieService.getQueuedRequestsCount();
    if (currentCount >= this.MAX_QUEUE_SIZE) {
      logWarn('⚠️ [GlobalQueue] Queue limit reached, dropping oldest request');
      // Get all requests and remove the oldest one
      const allRequests = await dexieService.getAllQueuedRequests();
      if (allRequests.length > 0) {
        await dexieService.removeQueuedRequest(allRequests[0].id);
      }
    }

    const queuedRequest: QueuedRequest = {
      id: Date.now() + Math.random().toString(),
      url: request.url,
      method: request.method,
      headers: this.serializeHeaders(request.headers),
      body: request.body ? await this.cloneBody(request.body) : null,
      timestamp: Date.now(),
      retryCount: 0,
      lastAttempt: 0,
      rollbackData
    };

    await dexieService.addQueuedRequest(queuedRequest);
    this.queueStatus.queueLength = await dexieService.getQueuedRequestsCount();
    
    logDebug(`📝 [GlobalQueue] Request queued: ${request.method} ${request.url} with body: ${queuedRequest.body}${rollbackData ? ` [rollback: ${rollbackData.operation}]` : ''}`);
    
    // Try to process queue if online
    const isOnline = await NetworkMonitor.isOnline();
    if (isOnline) {
      this.processQueuedRequestsInternal();
    }
  }

  private async processQueuedRequestsInternal(): Promise<void> {
    const queueCount = await dexieService.getQueuedRequestsCount();
    const isOnline = await NetworkMonitor.isOnline();
    if (this.queueStatus.isProcessing || queueCount === 0 || !isOnline) {
      return;
    }

    this.queueStatus.isProcessing = true;
    logDebug(`🔄 [GlobalQueue] Processing ${queueCount} queued requests...`);

    // Get current Supabase headers for authentication
    const supabaseHeaders = await this.getSupabaseHeaders();

    const itemsToProcess = await dexieService.getAllQueuedRequests();
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    for (const item of itemsToProcess) {
      try {
        // Check if item has exceeded max retries
        if (item.retryCount >= this.MAX_RETRY_COUNT) {
          logDebug(`💀 [GlobalQueue] Moving failed request to dead letter queue after ${this.MAX_RETRY_COUNT} retries:`, item);
          
          // ROLLBACK OPTIMISTIC UPDATE
          await this.rollbackRequest(item);
          
          // Move to dead letter queue
          await dexieService.addToDeadLetterQueue(item, 'Max retries exceeded');
          await dexieService.removeQueuedRequest(item.id);
          
          // Notify user about failed request
          this.notifyFailedRequest(item);
          
          errorCount++;
          continue;
        }

        // Check if enough time has passed for retry (exponential backoff)
        if (!this.canRetryRequest(item)) {
          skippedCount++;
          continue;
        }

        // Update retry count and last attempt timestamp
        await dexieService.updateQueuedRequest(item.id, {
          retryCount: item.retryCount + 1,
          lastAttempt: Date.now()
        });

        // Create headers with proper content-type for PATCH requests and current Supabase auth
        const headers = new Headers(item.headers);
        
        // Add current Supabase authentication headers
        if (supabaseHeaders) {
          Object.entries(supabaseHeaders).forEach(([key, value]) => {
            headers.set(key, value as string);
          });
        }
        
        if (item.method === 'PATCH' && item.body && !headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }

        const request = new Request(item.url, {
          method: item.method,
          headers: headers,
          body: item.body
        });

        logDebug(`🔄 [GlobalQueue] Replaying request (attempt ${item.retryCount + 1}/${this.MAX_RETRY_COUNT}): ${item.method} ${item.url}`);

        // Use original fetch to bypass interceptor
        const response = await window.fetch(request);
        
        if (response.ok) {
          // Handle successful PATCH requests by syncing to Dexie
          if (item.method === 'PATCH' && item.url.includes('shopping_items')) {
            try {
              const updatedItem = await response.clone().json();
              // Get current queued IDs (excluding the one we just processed)
              const queuedItemIds = await this.getQueuedItemIds();
              await dexieService.updateShoppingItemFromResponse(updatedItem, queuedItemIds);
              logDebug(`✅ [GlobalQueue] Synced PATCH response to Dexie: ${item.url}`);
            } catch (syncError) {
              logError('❌ [GlobalQueue] Failed to sync PATCH response to Dexie:', syncError);
            }
          }
          
          await dexieService.removeQueuedRequest(item.id);
          successCount++;
          logDebug(`✅ [GlobalQueue] Queued request successful after ${item.retryCount + 1} attempt(s): ${item.method} ${item.url}`);
        } else {
          // Check for specific error codes that should remove the item from queue
          if (response.status === 409) {
            try {
              const errorData = await response.clone().json();
              if (errorData.code === '23505') {
                // Duplicate key constraint violation - remove from queue as item already exists
                await dexieService.removeQueuedRequest(item.id);
                successCount++;
                logDebug(`✅ [GlobalQueue] Removed duplicate item from queue (23505): ${item.method} ${item.url}`);
                continue;
              }
            } catch (parseError) {
              logError('❌ [GlobalQueue] Failed to parse error response:', parseError);
            }
          }
          
          // Check for permanent errors (4xx except 409 handled above, 429 is retryable)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            logError(`❌ [GlobalQueue] Permanent error (${response.status}), removing from queue: ${item.method} ${item.url}`);
            
            // Report to Sentry before removing
            sentryErrorService.reportQueueError(new Error(`HTTP ${response.status}`), {
              queueLength: this.queueStatus.queueLength,
              requestUrl: item.url,
              requestMethod: item.method,
              retryCount: item.retryCount,
            });
            
            await dexieService.removeQueuedRequest(item.id);
            errorCount++;
            continue;
          }
          
          errorCount++;
          const backoffDelay = this.calculateBackoffDelay(item.retryCount + 1);
          logWarn(`⚠️ [GlobalQueue] Queued request failed (attempt ${item.retryCount + 1}/${this.MAX_RETRY_COUNT}): ${item.method} ${item.url} (Status: ${response.status}). Next retry in ${Math.ceil(backoffDelay / 1000)}s`);
        }
      } catch (error) {
        errorCount++;
        const backoffDelay = this.calculateBackoffDelay(item.retryCount + 1);
        logError(`❌ [GlobalQueue] Queued request error (attempt ${item.retryCount + 1}/${this.MAX_RETRY_COUNT}): ${item.method} ${item.url}. Next retry in ${Math.ceil(backoffDelay / 1000)}s`, error);
        
        // Report queue error to Sentry
        sentryErrorService.reportQueueError(error, {
          queueLength: this.queueStatus.queueLength,
          requestUrl: item.url,
          requestMethod: item.method,
          retryCount: item.retryCount + 1,
        });
      }
    }

    this.queueStatus.queueLength = await dexieService.getQueuedRequestsCount();
    this.queueStatus.isProcessing = false;
    
    logDebug(`✅ [GlobalQueue] Queue processing completed: ${successCount} successful, ${errorCount} failed, ${skippedCount} skipped (backoff)`);
  }

  private async getSupabaseHeaders(): Promise<Record<string, string> | null> {
    try {
      const supabaseClient = (window as any).supabase;
      if (!supabaseClient) {
        logWarn('⚠️ [GlobalQueue] Supabase client not available');
        return null;
      }

      // Get current session for authentication
      const { data: { session } } = await supabaseClient.auth.getSession();
      
      const headers: Record<string, string> = {};
      
      // Add API key
      if (supabaseClient.supabaseKey) {
        headers['apikey'] = supabaseClient.supabaseKey;
      }
      
      // Add authorization header if session exists
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      // Add other required Supabase headers
      headers['Content-Type'] = 'application/json';
      headers['Accept'] = 'application/json';
      
      logDebug(`🔑 [GlobalQueue] Retrieved Supabase headers: ${Object.keys(headers).join(', ')}`);
      return headers;
    } catch (error) {
      logError('❌ [GlobalQueue] Failed to get Supabase headers:', error);
      sentryErrorService.reportApiError(error, {
        url: 'supabase-headers',
        method: 'GET',
      });
      return null;
    }
  }

  private serializeHeaders(headers: Headers): Record<string, string> {
    const serialized: Record<string, string> = {};
    headers.forEach((value, key) => {
      serialized[key] = value;
    });
    return serialized;
  }

  private async cloneBody(body: BodyInit): Promise<string | null> {
    if (!body) return null;
    try {
      // Handle different body types
      if (typeof body === 'string') {
        return body;
      } else if (body instanceof FormData) {
        // Convert FormData to JSON-like structure
        const formDataObj: Record<string, any> = {};
        for (const [key, value] of body.entries()) {
          formDataObj[key] = value;
        }
        return JSON.stringify(formDataObj);
      } else if (body instanceof URLSearchParams) {
        return body.toString();
      } else if (body instanceof ArrayBuffer) {
        return new TextDecoder().decode(body);
      } else if (body instanceof ReadableStream) {
        // For ReadableStream, we need to read it
        const reader = body.getReader();
        const chunks: Uint8Array[] = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            chunks.push(value);
          }
        }
        
        // Combine chunks and decode
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        
        return new TextDecoder().decode(combined);
      } else {
        // For other types, try to convert to string
        return await new Response(body).text();
      }
    } catch (error) {
      logError('❌ [GlobalQueue] Failed to clone body:', error);
      sentryErrorService.reportApiError(error, {
        url: 'body-clone',
        method: 'POST',
      });
      return null;
    }
  }

  private async loadQueueFromDexie(): Promise<void> {
    try {
      const queueCount = await dexieService.getQueuedRequestsCount();
      this.queueStatus.queueLength = queueCount;
      logDebug(`📊 [GlobalQueue] Loaded ${queueCount} queued requests from Dexie`);
    } catch (error) {
      logError('❌ [GlobalQueue] Failed to load queue from Dexie:', error);
      sentryErrorService.reportApiError(error, {
        url: 'queue-load',
        method: 'GET',
      });
      this.queueStatus.queueLength = 0;
    }
  }

  // Public methods
  public async processQueuedRequests(): Promise<void> {
    await this.processQueuedRequestsInternal();
  }

  public async clearQueuedRequests(): Promise<void> {
    await dexieService.clearQueuedRequests();
    this.queueStatus = { queueLength: 0, isProcessing: false };
    logDebug('🗑️ [GlobalQueue] Queue cleared');
  }

  public async getQueueStatus(): Promise<QueueStatus> {
    const queueLength = await dexieService.getQueuedRequestsCount();
    return { queueLength, isProcessing: this.queueStatus.isProcessing };
  }

  public async addRequestToQueue(request: Request, rollbackData?: RollbackData): Promise<void> {
    await this.queueRequest(request, rollbackData);
  }

  public isProcessing(): boolean {
    return this.queueStatus.isProcessing;
  }

  public async getQueueLength(): Promise<number> {
    return await dexieService.getQueuedRequestsCount();
  }

  public getStatus(): { queueLength: number; isProcessing: boolean; isOnline: boolean } {
    return {
      queueLength: this.queueStatus.queueLength,
      isProcessing: this.queueStatus.isProcessing,
      isOnline: NetworkMonitor.getCachedStatus()
    };
  }

  public async forceProcessQueue(): Promise<void> {
    logDebug('🔄 [GlobalQueue] Force processing queue...');
    await this.processQueuedRequestsInternal();
  }

  public async getQueueDetails(): Promise<{ total: number; byMethod: Record<string, number> }> {
    try {
      const allRequests = await dexieService.getAllQueuedRequests();
      const byMethod: Record<string, number> = {};
      
      allRequests.forEach(request => {
        byMethod[request.method] = (byMethod[request.method] || 0) + 1;
      });
      
      return {
        total: allRequests.length,
        byMethod
      };
    } catch (error) {
      logError('❌ [GlobalQueue] Failed to get queue details:', error);
      return { total: 0, byMethod: {} };
    }
  }

  /**
   * Register a callback to be called after queue sync completes
   * Useful for refreshing data after going online
   */
  public onPostSync(callback: PostSyncCallback): () => void {
    this.postSyncCallbacks.add(callback);
    return () => this.postSyncCallbacks.delete(callback);
  }

  /**
   * Check if an item ID is currently queued for update
   * Used to prevent overwriting pending changes during sync
   */
  public async isItemQueued(itemId: string): Promise<boolean> {
    try {
      const allRequests = await dexieService.getAllQueuedRequests();
      const isQueued = allRequests.some(request => 
        request.url.includes(`shopping_items`) && 
        (request.url.includes(`id=eq.${itemId}`) || request.url.endsWith(`/${itemId}`))
      );
      
      if (isQueued) {
        logDebug(`🔍 [GlobalQueue] Item ${itemId} is queued for update`);
      }
      
      return isQueued;
    } catch (error) {
      logError('❌ [GlobalQueue] Failed to check if item is queued:', error);
      return false;
    }
  }

  /**
   * Get all item IDs that are currently queued for updates
   * Returns a Set for efficient lookup
   */
  public async getQueuedItemIds(): Promise<Set<string>> {
    try {
      const allRequests = await dexieService.getAllQueuedRequests();
      const queuedIds = new Set<string>();
      
      allRequests.forEach(request => {
        if (request.url.includes('shopping_items')) {
          // Extract ID from URL patterns like:
          // - /shopping_items?id=eq.abc-123
          // - /shopping_items/abc-123
          const eqMatch = request.url.match(/id=eq\.([^&]+)/);
          const pathMatch = request.url.match(/shopping_items\/([^?&]+)/);
          
          if (eqMatch) {
            queuedIds.add(eqMatch[1]);
          } else if (pathMatch) {
            queuedIds.add(pathMatch[1]);
          }
        }
      });
      
      if (queuedIds.size > 0) {
        logDebug(`🔍 [GlobalQueue] Found ${queuedIds.size} queued item IDs`);
      }
      
      return queuedIds;
    } catch (error) {
      logError('❌ [GlobalQueue] Failed to get queued item IDs:', error);
      return new Set();
    }
  }

  /**
   * Get all queued requests (for checking conflicts with realtime updates)
   */
  async getQueuedRequests(): Promise<QueuedRequest[]> {
    return await dexieService.getAllQueuedRequests();
  }
}

// Export singleton instance
export const globalQueueService = new GlobalQueueService();
