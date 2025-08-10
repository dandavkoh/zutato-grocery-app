import { supabase } from '../config/supabase';
import { logDebug, logError, logInfo } from '../config/environment';
import { dexieService } from './dexieService';

/**
 * Service for syncing shopping items data
 * This avoids circular imports between realtimeService and supabaseApi
 */
class DataSyncService {
  /**
   * Reload shopping items for a specific list
   */
  async reloadShoppingItems(listId: string): Promise<void> {
    try {
      logDebug('Reloading shopping items from Supabase', { listId });
      
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('list_id', listId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      
      if (error) {
        logError('Failed to reload shopping items', error);
        throw error;
      }
      
      // Persist latest data to Dexie so UI updates immediately on other devices
      if (Array.isArray(data)) {
        await dexieService.syncShoppingItems(data as any);
        logInfo('Successfully reloaded and synced shopping items', { listId, count: data.length });
      } else {
        logInfo('Successfully reloaded shopping items (no array)', { listId, count: 0 });
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