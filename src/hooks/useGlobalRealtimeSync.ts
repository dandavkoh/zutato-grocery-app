import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { realtimeService } from '../services/realtimeService';
import { logDebug, logInfo } from '../config/environment';

/**
 * Global Realtime Sync Hook
 * Automatically manages realtime subscriptions based on the current route
 */
export const useGlobalRealtimeSync = () => {
  const location = useLocation();
  const currentListIdRef = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Extract listId from current path
    const pathParts = location.pathname.split('/');
    const listIdIndex = pathParts.findIndex(part => part === 'shopping-list') + 1;
    const listId = pathParts[listIdIndex];

    // Check if we're on a shopping list route
    const isShoppingListRoute = location.pathname.startsWith('/shopping-list/') && listId;

    if (isShoppingListRoute && listId !== currentListIdRef.current) {
      logInfo('Global realtime sync: Switching to new list', { 
        oldListId: currentListIdRef.current, 
        newListId: listId,
        path: location.pathname 
      });

      // Unsubscribe from previous list
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      // Subscribe to new list
      if (listId) {
        currentListIdRef.current = listId;
        unsubscribeRef.current = realtimeService.subscribeToList(listId, () => {
          logDebug('Global realtime sync: Update received', { listId });
          // Force a page refresh or trigger a global update
          window.dispatchEvent(new CustomEvent('realtime-update', { 
            detail: { listId } 
          }));
        });

        logInfo('Global realtime sync: Subscribed to list', { listId });
      }
    } else if (!isShoppingListRoute && currentListIdRef.current) {
      logInfo('Global realtime sync: Leaving shopping list route', { 
        listId: currentListIdRef.current,
        path: location.pathname 
      });

      // Unsubscribe when leaving shopping list routes
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      currentListIdRef.current = null;
    }

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [location.pathname]);

  return {
    currentListId: currentListIdRef.current,
    isConnected: realtimeService.isConnected(),
  };
}; 