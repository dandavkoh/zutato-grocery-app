import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useRef } from 'react';
import { db, type ShoppingItem } from '../services/dexieService';
import { ShoppingItemsController } from '../api/supabaseApi';
import type { CreateShoppingItemRequest, UpdateShoppingItemRequest } from '../api/supabaseApi';
import { globalQueueService } from '../services/globalQueueService';
import { sentryErrorService } from '../services/sentryErrorService';
import { NetworkMonitor } from '../utils/networkUtils';

const shoppingItemsController = new ShoppingItemsController();

export const useShoppingItemsDexie = (listId: string) => {
  const onlineUnsubscribeRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  // Load items from Dexie using Live Query
  const items = useLiveQuery(
    () => db.shoppingItems
      .where('list_id')
      .equals(listId)
      .filter(item => !item.is_deleted)
      .reverse()
      .sortBy('created_at'),
    [listId]
  ) || [];

  // Refresh items from Supabase with proper queue handling
  const refreshItems = useCallback(async () => {
    try {
      console.log('Refreshing shopping items from Supabase...');
      
      // Process queue first if online and queue has items
      const isOnline = await NetworkMonitor.isOnline();
      if (isOnline) {
        const queueLength = await globalQueueService.getQueueLength();
        if (queueLength > 0) {
          console.log(`Processing ${queueLength} queued requests before refreshing...`);
          try {
            await globalQueueService.processQueuedRequests();
            console.log('Queue processed successfully before refresh');
          } catch (queueError) {
            console.error('Queue processing failed before refresh:', queueError);
            // Continue with refresh even if queue processing fails
          }
        }
      }
      
      // Now fetch from Supabase (getItems will double-check queue again)
      const response = await shoppingItemsController.getItems(listId);
      if (response.error) {
        throw new Error(response.error);
      }
      console.log('Shopping items refreshed successfully');
      return response.data;
    } catch (err) {
      console.error('Error refreshing items:', err);
      throw err;
    }
  }, [listId]);

  // Sync with Supabase on mount with proper error handling and retry
  useEffect(() => {
    let retryTimeout: NodeJS.Timeout | null = null;

    const initialSync = async () => {
      if (!listId || !mountedRef.current) return;
      
      try {
        console.log('Initial sync for list:', listId);
        await refreshItems();
      } catch (error) {
        console.error('Initial sync failed, will retry in 5s:', error);
        sentryErrorService.reportApiError(error, {
          context: 'initialShoppingItemsSync',
          listId
        });
        // Retry once after 5 seconds
        retryTimeout = setTimeout(async () => {
          if (!mountedRef.current) return;
          try {
            console.log('Retrying initial sync for list:', listId);
            await refreshItems();
          } catch (retryError) {
            console.error('Initial sync retry failed:', retryError);
            sentryErrorService.reportApiError(retryError, {
              context: 'initialShoppingItemsSyncRetry',
              listId
            });
          }
        }, 5000);
      }
    };

    initialSync();

    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [listId, refreshItems]);

  // Listen for online events and proactively sync when going online
  useEffect(() => {
    const handleOnline = async () => {
      console.log('Network restored, refreshing items for list:', listId);
      try {
        // Wait a bit for connection to stabilize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!mountedRef.current) return;
        
        // Process queue and refresh items
        await refreshItems();
        console.log('Successfully synced after coming online');
      } catch (error) {
        console.error('Failed to sync after coming online:', error);
        sentryErrorService.reportApiError(error, {
          context: 'syncShoppingItemsOnline',
          listId
        });
      }
    };

    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [listId, refreshItems]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (onlineUnsubscribeRef.current) {
        onlineUnsubscribeRef.current();
        onlineUnsubscribeRef.current = null;
      }
    };
  }, []);

  // Create item
  const createItem = useCallback(async (itemData: CreateShoppingItemRequest) => {
    try {
      const response = await shoppingItemsController.createItem(itemData);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    } catch (err) {
      console.error('Error creating item:', err);
      throw err;
    }
  }, []);

  // Update item
  const updateItem = useCallback(async (id: string, updates: UpdateShoppingItemRequest) => {
    try {
      const response = await shoppingItemsController.updateItem(id, updates);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    } catch (err) {
      console.error('Error updating item:', err);
      throw err;
    }
  }, []);

  // Delete item
  const deleteItem = useCallback(async (id: string) => {
    try {
      const response = await shoppingItemsController.deleteItem(id, listId);
      if (response.error) {
        throw new Error(response.error);
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      throw err;
    }
  }, [listId]);

  // Set item completion
  const setItemCompletion = useCallback(async (id: string, isCompleted: boolean) => {
    try {
      // Use the setItemCompletion method
      const response = await shoppingItemsController.setItemCompletion(id, isCompleted);
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data;
    } catch (err) {
      console.error('Error setting item completion:', err);
      throw err;
    }
  }, []);



  return {
    items,
    loading: items === undefined, // Live Query loading state
    error: null, // Live Query handles errors internally
    createItem,
    updateItem,
    deleteItem,
    setItemCompletion,
    refreshItems,
  };
}; 