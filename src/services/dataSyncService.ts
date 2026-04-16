import { supabase } from '../config/supabase';
import { logDebug, logError, logInfo } from '../config/environment';
import { dexieService } from './dexieService';
import { globalQueueService } from './globalQueueService';
import { sentryErrorService } from './sentryErrorService';

class DataSyncService {
  private ongoingReloads: Map<string, Promise<void>> = new Map();
  private reloadDebounceTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Reload shopping items for a specific list from the server
   * Includes debouncing and deduplication to prevent race conditions
   */
  async reloadShoppingItems(listId: string): Promise<void> {
    try {
      // ✅ FIX: Clear any pending debounce timer
      const existingTimer = this.reloadDebounceTimers.get(listId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        this.reloadDebounceTimers.delete(listId);
      }

      // ✅ FIX: If reload already in progress, wait for it instead of starting new one
      const ongoingReload = this.ongoingReloads.get(listId);
      if (ongoingReload) {
        logDebug('⏳ [DataSync] Reload already in progress, waiting for completion', { listId });
        return ongoingReload;
      }

      // Create new reload promise
      const reloadPromise = this._reloadShoppingItemsInternal(listId);
      this.ongoingReloads.set(listId, reloadPromise);

      try {
        await reloadPromise;
      } finally {
        this.ongoingReloads.delete(listId);
      }
    } catch (error) {
      logError('❌ [DataSync] Error reloading shopping items', { listId, error });
      throw error;
    }
  }

  /**
   * Debounced version - waits 500ms before reloading to batch multiple rapid calls
   */
  async reloadShoppingItemsDebounced(listId: string, delayMs: number = 500): Promise<void> {
    const existingTimer = this.reloadDebounceTimers.get(listId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(async () => {
        this.reloadDebounceTimers.delete(listId);
        try {
          await this.reloadShoppingItems(listId);
          resolve();
        } catch (error) {
          reject(error);
        }
      }, delayMs);

      this.reloadDebounceTimers.set(listId, timer);
    });
  }

  /**
   * Internal implementation of reload logic
   */
  private async _reloadShoppingItemsInternal(listId: string): Promise<void> {
    logInfo('🔄 [DataSync] Reloading shopping items from server', { listId });

    // Wait for queue to finish processing for this list
    const startTime = Date.now();
    const maxWaitTime = 3000; // Wait max 3 seconds
    let queueStatus = await globalQueueService.getQueueStatus();
    
    while (queueStatus.isProcessing && (Date.now() - startTime) < maxWaitTime) {
      logDebug('⏳ [DataSync] Waiting for queue to finish processing...', { listId });
      await new Promise(resolve => setTimeout(resolve, 200));
      queueStatus = await globalQueueService.getQueueStatus();
    }

    // Fetch items from Supabase
    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('list_id', listId)
      .eq('is_deleted', false);

    if (error) {
      logError('❌ [DataSync] Failed to reload shopping items:', error);
      throw error;
    }

    // ✅ FIX: Sync fetched data to Dexie with proper conflict detection
    if (data && data.length > 0) {
      try {
        // Get queued item IDs (including items being processed)
        const queuedItemIds = await globalQueueService.getQueuedItemIds();
        
        logInfo('📥 [DataSync] Syncing items to Dexie', {
          listId,
          serverItemsCount: data.length,
          queuedItemsCount: queuedItemIds.size,
          queuedIds: Array.from(queuedItemIds)
        });

        // Sync items to Dexie
        await dexieService.syncShoppingItems(data, queuedItemIds);

        logInfo('✅ [DataSync] Successfully synced shopping items to Dexie', {
          listId,
          count: data.length
        });
      } catch (syncError) {
        logError('❌ [DataSync] Failed to sync items to Dexie:', syncError);
        sentryErrorService.reportApiError(syncError, {
          context: 'reloadShoppingItems_dexieSync',
          listId
        });
        throw syncError;
      }
    } else {
      logInfo('✅ [DataSync] No items to sync for list', { listId });
    }
  }

  /**
   * Cleanup method to clear all pending timers
   */
  cleanup(): void {
    this.reloadDebounceTimers.forEach(timer => clearTimeout(timer));
    this.reloadDebounceTimers.clear();
  }

  /**
   * Check if we're online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Add online status listener
   */
  onOnline(callback: () => void): () => void {
    const handleOnline = () => {
      logInfo('Online status detected by DataSyncService');
      callback();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }
}

// Export singleton instance
export const dataSyncService = new DataSyncService(); 