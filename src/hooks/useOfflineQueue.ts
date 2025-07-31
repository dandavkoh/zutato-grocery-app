import { useEffect, useCallback } from 'react';
import { realtimeService } from '../services/realtimeService';
import { logInfo, logDebug } from '../config/environment';

interface QueuedAction {
  id: string;
  type: 'item_created' | 'item_updated' | 'item_deleted' | 'item_completed';
  listId: string;
  itemId?: string;
  timestamp: string;
}

class OfflineQueueManager {
  private queue: QueuedAction[] = [];
  private readonly STORAGE_KEY = 'offline_queue';

  constructor() {
    this.loadQueue();
  }

  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        logDebug('Loaded offline queue', { count: this.queue.length });
      }
    } catch (error) {
      logDebug('Failed to load offline queue', { error });
      this.queue = [];
    }
  }

  private saveQueue(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      logDebug('Failed to save offline queue', { error });
    }
  }

  addToQueue(action: Omit<QueuedAction, 'id' | 'timestamp'>): void {
    const queuedAction: QueuedAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };

    this.queue.push(queuedAction);
    this.saveQueue();
    logDebug('Added action to offline queue', { action: queuedAction });
  }

  async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      logDebug('No actions in offline queue to process');
      return;
    }

    logInfo('Processing offline queue', { count: this.queue.length });

    const actionsToProcess = [...this.queue];
    this.queue = [];
    this.saveQueue();

    for (const action of actionsToProcess) {
      try {
        await realtimeService.broadcastUpdate(action.listId, {
          type: action.type,
          listId: action.listId,
          itemId: action.itemId
        });
        logDebug('Successfully processed queued action', { action });
      } catch (error) {
        logDebug('Failed to process queued action, re-adding to queue', { action, error });
        this.queue.push(action);
      }
    }

    this.saveQueue();
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
    logDebug('Cleared offline queue');
  }
}

const offlineQueueManager = new OfflineQueueManager();

export const useOfflineQueue = () => {
  const addToQueue = useCallback((action: Omit<QueuedAction, 'id' | 'timestamp'>) => {
    offlineQueueManager.addToQueue(action);
  }, []);

  const processQueue = useCallback(async () => {
    await offlineQueueManager.processQueue();
  }, []);

  const getQueueLength = useCallback(() => {
    return offlineQueueManager.getQueueLength();
  }, []);

  const clearQueue = useCallback(() => {
    offlineQueueManager.clearQueue();
  }, []);

  // Process queue when coming back online
  useEffect(() => {
    const unsubscribe = realtimeService.onOnline(async () => {
      logInfo('Processing offline queue after coming back online');
      await processQueue();
    });

    return unsubscribe;
  }, [processQueue]);

  return {
    addToQueue,
    processQueue,
    getQueueLength,
    clearQueue,
  };
}; 