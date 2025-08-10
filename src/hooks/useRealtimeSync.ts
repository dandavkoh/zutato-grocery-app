import { useEffect, useRef, useCallback } from 'react';
import { realtimeService } from '../services/realtimeService';
import { dataSyncService } from '../services/dataSyncService';
import { logDebug, logInfo, logError } from '../config/environment';

export const useRealtimeSync = (listId: string | undefined, onUpdate: () => void) => {
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const onlineUnsubscribeRef = useRef<(() => void) | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Subscribe to realtime updates
  const subscribeToUpdates = useCallback(() => {
    if (!listId) {
      logDebug('No listId provided for realtime sync');
      return;
    }

    logInfo('Setting up realtime sync for list', { listId });

    // Handler: trigger UI update and reload items (debounced)
    const handleRealtime = () => {
      try {
        onUpdate();
      } catch (e) {
        logError('onUpdate callback error', e as any);
      }
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
      debounceRef.current = window.setTimeout(async () => {
        try {
          if (listId) {
            await dataSyncService.reloadShoppingItems(listId);
            logDebug('Reloaded shopping items after realtime event', { listId });
          }
        } catch (error) {
          logError('Failed to reload shopping items after realtime event', { listId, error });
        }
      }, 150);
    };

    // Subscribe to the list channel
    unsubscribeRef.current = realtimeService.subscribeToList(listId, handleRealtime);

    // Subscribe to online status changes
    onlineUnsubscribeRef.current = realtimeService.onOnline(async () => {
      logInfo('Online status restored, triggering update and reload', { listId });
      
      // Trigger immediate update
      onUpdate();
      
      // Also reload data from Supabase to ensure we have the latest state
      if (listId) {
        try {
          await dataSyncService.reloadShoppingItems(listId);
          logInfo('Successfully reloaded data after coming back online', { listId });
        } catch (error) {
          logError('Failed to reload data after coming back online', { listId, error });
        }
      }
    });

  }, [listId, onUpdate]);

  // Unsubscribe from updates
  const unsubscribeFromUpdates = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (onlineUnsubscribeRef.current) {
      onlineUnsubscribeRef.current();
      onlineUnsubscribeRef.current = null;
    }
  }, []);

  // Set up subscription when listId changes
  useEffect(() => {
    if (listId) {
      subscribeToUpdates();
    }

    // Cleanup on unmount or when listId changes
    return () => {
      unsubscribeFromUpdates();
    };
  }, [listId, subscribeToUpdates, unsubscribeFromUpdates]);

  // Return functions for manual control
  return {
    subscribe: subscribeToUpdates,
    unsubscribe: unsubscribeFromUpdates,
    isConnected: realtimeService.isConnected(),
    getActiveChannels: realtimeService.getActiveChannels(),
  };
}; 