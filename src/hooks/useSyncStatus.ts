import { useState, useEffect } from 'react';
import { globalQueueService } from '../services/globalQueueService';

export interface SyncStatus {
  isOnline: boolean;
  queueLength: number;
  isSyncing: boolean;
  lastSyncTime: Date | null;
}

/**
 * Hook that provides real-time sync status information
 * Tracks online/offline state, queue length, sync progress, and last sync time
 */
export const useSyncStatus = (): SyncStatus => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueLength, setQueueLength] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | undefined;
    let unsubscribePostSync: (() => void) | undefined;
    
    try {
      // Initialize queue length
      const initializeQueueLength = async () => {
        const length = await globalQueueService.getQueueLength();
        setQueueLength(length);
      };
      initializeQueueLength();

      // Handle online/offline events
      const handleOnline = () => {
        console.log('🌐 [useSyncStatus] Online');
        setIsOnline(true);
      };

      const handleOffline = () => {
        console.log('📴 [useSyncStatus] Offline');
        setIsOnline(false);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Poll queue status periodically
      pollInterval = setInterval(async () => {
        try {
          const status = globalQueueService.getStatus();
          setQueueLength(status.queueLength);
          setIsSyncing(status.isProcessing);
          setIsOnline(status.isOnline);
        } catch (error) {
          console.error('❌ [useSyncStatus] Error polling queue status:', error);
        }
      }, 1000); // Check every second

      // Subscribe to post-sync events to update last sync time
      unsubscribePostSync = globalQueueService.onPostSync(() => {
        console.log('✅ [useSyncStatus] Sync completed');
        setLastSyncTime(new Date());
        // Update queue length immediately after sync
        globalQueueService.getQueueLength().then(setQueueLength);
      });

      // Cleanup
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        if (pollInterval) {
          clearInterval(pollInterval);
        }
        if (unsubscribePostSync) {
          unsubscribePostSync();
        }
      };
    } catch (error) {
      console.error('❌ [useSyncStatus] Error in useEffect setup:', error);
      // Cleanup on error
      return () => {
        if (pollInterval) {
          clearInterval(pollInterval);
        }
        if (unsubscribePostSync) {
          unsubscribePostSync();
        }
      };
    }
  }, []);

  return {
    isOnline,
    queueLength,
    isSyncing,
    lastSyncTime,
  };
};
