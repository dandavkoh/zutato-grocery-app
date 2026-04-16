import { supabase } from '../config/supabase';
import { logDebug, logError, logInfo } from '../config/environment';
import { dexieService } from './dexieService';
import { globalQueueService } from './globalQueueService';
import { sentryErrorService } from './sentryErrorService';

/**
 * Service for syncing shopping items data
 * This avoids circular imports between realtimeService and supabaseApi
 */
class DataSyncService {
  /**
   * Reload shopping items for a specific list
   * Processes queue first to ensure all pending changes are synced
   */
  async reloadShoppingItems(listId: string): Promise<void> {
    try {
      logDebug('Reloading shopping items from Supabase', { listId });
      
      // Process queue first if online and queue has items
      if (navigator.onLine) {
        const queueLength = await globalQueueService.getQueueLength();
        if (queueLength > 0) {
          logInfo('Processing queue before reloading items', { listId, queueLength });
          try {
            await globalQueueService.processQueuedRequests();
            logInfo('Queue processed successfully before reload', { listId });
          } catch (queueError) {
            logError('Queue processing failed before reload', { listId, error: queueError });
            // Continue with reload even if queue processing fails
          }
        }
      }
      
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('list_id', listId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      
      if (error) {
        logError('❌ Failed to reload shopping items:', error);
        throw error;
      }
      
      // Sync fetched data to Dexie
      if (data && data.length > 0) {
        try {
          // Get queued item IDs to avoid overwriting optimistic updates
          const queuedItemIds = await globalQueueService.getQueuedItemIds();
          
          // Sync items to Dexie, but skip items with pending changes
          for (const item of data) {
            if (!queuedItemIds.has(item.id)) {
              await dexieService.updateShoppingItemFromResponse(item);
            }
          }
          
          logInfo('✅ Successfully synced shopping items to Dexie', { 
            listId, 
            count: data.length,
            skipped: queuedItemIds.size 
          });
        } catch (syncError) {
          logError('❌ Failed to sync items to Dexie:', syncError);
          sentryErrorService.reportApiError(syncError, {
            context: 'reloadShoppingItems_dexieSync',
            listId
          });
        }
      } else {
        logInfo('✅ No items to sync for list', { listId });
      }
    } catch (error) {
      logError('Error reloading shopping items', { listId, error });
      throw error;
    }
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