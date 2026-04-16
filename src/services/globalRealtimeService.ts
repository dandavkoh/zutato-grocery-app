import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { realtimeService } from './realtimeService';
import { dataSyncService } from './dataSyncService';
import { globalQueueService } from './globalQueueService';
import { sentryErrorService } from './sentryErrorService';
import { logDebug, logInfo, logError } from '../config/environment';

/**
 * Global Realtime Service Hook
 * 
 * This hook manages realtime subscriptions globally based on the current route.
 * It automatically subscribes to the appropriate list channel when navigating
 * to shopping list related pages and unsubscribes when leaving them.
 */
export const useGlobalRealtimeSync = () => {
  const location = useLocation();
  const currentListIdRef = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const onlineUnsubscribeRef = useRef<(() => void) | null>(null);
  const postSyncUnsubscribeRef = useRef<(() => void) | null>(null);
  const debounceRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Extract listId from current route
  const extractListIdFromPath = (pathname: string): string | null => {
    // Match patterns like /shopping-list/:listId or /shopping-list/:listId/...
    const match = pathname.match(/^\/shopping-list\/([^\/]+)/);
    return match ? match[1] : null;
  };

  // Handle realtime updates
  const handleRealtimeUpdate = (listId: string) => {
    try {
      logDebug('Global realtime update received', { listId });
      
      // Trigger data reload with debouncing
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
      
      debounceRef.current = window.setTimeout(async () => {
        if (!mountedRef.current) return;
        
        try {
          await dataSyncService.reloadShoppingItems(listId);
          logDebug('Reloaded shopping items after global realtime event', { listId });
        } catch (error) {
          logError('Failed to reload shopping items after global realtime event', { listId, error });
          sentryErrorService.reportApiError(error, {
            context: 'reloadShoppingItemsRealtimeUpdate',
            listId
          });
        }
      }, 150);
    } catch (error) {
      logError('Error in global realtime update handler', { listId, error });
      sentryErrorService.reportApiError(error, {
        context: 'handleRealtimeUpdate',
        listId
      });
    }
  };

  // Subscribe to a list channel
  const subscribeToList = (listId: string) => {
    if (currentListIdRef.current === listId) {
      logDebug('Already subscribed to list', { listId });
      return;
    }

    logInfo('Global realtime: Subscribing to list', { listId });

    // Unsubscribe from previous list if any
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (onlineUnsubscribeRef.current) {
      onlineUnsubscribeRef.current();
      onlineUnsubscribeRef.current = null;
    }

    if (postSyncUnsubscribeRef.current) {
      postSyncUnsubscribeRef.current();
      postSyncUnsubscribeRef.current = null;
    }

    // Subscribe to new list
    unsubscribeRef.current = realtimeService.subscribeToList(listId, () => {
      handleRealtimeUpdate(listId);
    });

    // Subscribe to online status changes
    onlineUnsubscribeRef.current = realtimeService.onOnline(async () => {
      if (!mountedRef.current) return;
      
      logInfo('Global realtime: Online status restored, reloading data', { listId });
      
      try {
        await dataSyncService.reloadShoppingItems(listId);
        logInfo('Successfully reloaded data after coming back online', { listId });
      } catch (error) {
        logError('Failed to reload data after coming back online', { listId, error });
        sentryErrorService.reportApiError(error, {
          context: 'reloadShoppingItemsOnline',
          listId
        });
      }
    });

    // Subscribe to post-sync callbacks (after queue is processed)
    postSyncUnsubscribeRef.current = globalQueueService.onPostSync(async () => {
      if (!mountedRef.current || currentListIdRef.current !== listId) return;
      
      logInfo('Global realtime: Post-sync callback triggered, reloading data', { listId });
      
      try {
        await dataSyncService.reloadShoppingItems(listId);
        logInfo('Successfully reloaded data after queue sync', { listId });
      } catch (error) {
        logError('Failed to reload data after queue sync', { listId, error });
        sentryErrorService.reportApiError(error, {
          context: 'reloadShoppingItemsPostSync',
          listId
        });
      }
    });

    currentListIdRef.current = listId;
  };

  // Unsubscribe from current list
  const unsubscribeFromCurrentList = () => {
    if (unsubscribeRef.current) {
      logInfo('Global realtime: Unsubscribing from list', { listId: currentListIdRef.current });
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    if (onlineUnsubscribeRef.current) {
      onlineUnsubscribeRef.current();
      onlineUnsubscribeRef.current = null;
    }

    if (postSyncUnsubscribeRef.current) {
      postSyncUnsubscribeRef.current();
      postSyncUnsubscribeRef.current = null;
    }

    currentListIdRef.current = null;
  };

  // Main effect: Handle route changes
  useEffect(() => {
    const listId = extractListIdFromPath(location.pathname);
    
    logDebug('Global realtime: Route changed', { 
      pathname: location.pathname, 
      extractedListId: listId,
      currentListId: currentListIdRef.current 
    });

    // If we're on a shopping list page
    if (listId) {
      // If we're switching to a different list or subscribing for the first time
      if (currentListIdRef.current !== listId) {
        subscribeToList(listId);
      }
    } else {
      // If we're not on a shopping list page, unsubscribe
      if (currentListIdRef.current !== null) {
        unsubscribeFromCurrentList();
      }
    }

    // Cleanup on unmount or route change
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [location.pathname]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      unsubscribeFromCurrentList();
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, []);

  // Return current state for debugging/monitoring
  return {
    currentListId: currentListIdRef.current,
    isConnected: realtimeService.isConnected(),
    activeChannels: realtimeService.getActiveChannels(),
  };
};

/**
 * Global Realtime Provider Component
 * 
 * This component should be placed high in the component tree (e.g., in App.tsx)
 * to ensure it's always active and can monitor route changes.
 */
export const GlobalRealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  useGlobalRealtimeSync();
  return children;
};
