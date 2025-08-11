import { supabase } from '../config/supabase';
import { logDebug, logError, logInfo } from '../config/environment';

export interface RealtimeMessage {
  type: 'item_created' | 'item_updated' | 'item_deleted' | 'item_completed';
  listId: string;
  itemId?: string;
  timestamp: string;
}

class RealtimeService {
  private channels: Map<string, any> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isOnline = navigator.onLine;
  private onlineListeners: Set<() => void> = new Set();

  constructor() {
    this.setupOnlineStatusListener();
  }

  private setupOnlineStatusListener() {
    window.addEventListener('online', () => {
      logInfo('Internet connection restored');
      this.isOnline = true;
      this.processOfflineQueue();
      this.onlineListeners.forEach(listener => listener());
    });

    window.addEventListener('offline', () => {
      logInfo('Internet connection lost');
      this.isOnline = false;
    });

    // Handle page visibility changes (standby/resume)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        logInfo('Page became visible (resume from standby)');
        this.handleResumeFromStandby();
      } else {
        logInfo('Page became hidden (going to standby)');
        this.handleGoingToStandby();
      }
    });

    // Handle focus events (additional standby detection)
    window.addEventListener('focus', () => {
      logInfo('Window gained focus');
      this.handleResumeFromStandby();
    });

    // Handle beforeunload (cleanup)
    window.addEventListener('beforeunload', () => {
      logInfo('Page unloading, cleaning up realtime connections');
      this.cleanup();
    });
  }

  /**
   * Subscribe to a shopping list channel for real-time updates
   */
  subscribeToList(listId: string, onUpdate: () => void): () => void {
    logInfo('Subscribing to list channel', { listId });

    // Unsubscribe from existing channel if it exists
    this.unsubscribeFromList(listId);

    // Create new channel
    const channel = supabase
      .channel(`list-${listId}`)
      // .on('broadcast', { event: 'shopping_list_update' }, (payload) => {
      //   logDebug('Received realtime update', { listId, payload });
      //   this.handleRealtimeUpdate(listId, payload, onUpdate);
      // })
      // Listen to database changes for cross-device sync without explicit broadcast
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items', filter: `list_id=eq.${listId}` }, (payload: any) => {
        try {
          logDebug('Received DB change event', { listId, eventType: payload?.eventType, payload });
          const mappedType: RealtimeMessage['type'] = payload?.eventType === 'INSERT'
            ? 'item_created'
            : payload?.eventType === 'DELETE'
              ? 'item_deleted'
              : 'item_updated';
          const synthetic = {
            type: mappedType,
            listId,
            itemId: payload?.new?.id || payload?.old?.id,
            timestamp: new Date().toISOString()
          } satisfies RealtimeMessage;
          this.handleRealtimeUpdate(listId, { payload: synthetic }, onUpdate);
        } catch (e) {
          logError('Error handling DB change event', { listId, error: e });
        }
      })
      .on('presence', { event: 'sync' }, () => {
        logDebug('Presence sync', { listId });
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        logDebug('User joined', { listId, key, newPresences });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        logDebug('User left', { listId, key, leftPresences });
      })
      .on('system', { event: 'disconnect' }, () => {
        logError('Realtime connection lost', { listId });
        this.handleDisconnect(listId, onUpdate);
      })
      .on('system', { event: 'reconnect' }, () => {
        logInfo('Realtime connection restored', { listId });
        this.resetReconnectAttempts(listId);
      });

    // Subscribe to the channel
    channel.subscribe((status: any) => {
      logDebug('Channel subscription status', { listId, status });
      
      if (status === 'SUBSCRIBED') {
        logInfo('Successfully subscribed to list channel', { listId });
        this.resetReconnectAttempts(listId);
      } else if (status === 'CHANNEL_ERROR') {
        logError('Channel subscription error', { listId });
        this.handleDisconnect(listId, onUpdate);
      }
    });

    // Store the channel
    this.channels.set(listId, channel);

    // Return unsubscribe function
    return () => this.unsubscribeFromList(listId);
  }

  /**
   * Unsubscribe from a shopping list channel
   */
  unsubscribeFromList(listId: string): void {
    const channel = this.channels.get(listId);
    if (channel) {
      logInfo('Unsubscribing from list channel', { listId });
      supabase.removeChannel(channel);
      this.channels.delete(listId);
      this.reconnectAttempts.delete(listId);
    }
  }

  /**
   * Broadcast an update to all subscribers of a list
   */
  async broadcastUpdate(listId: string, message: Omit<RealtimeMessage, 'timestamp'>): Promise<void> {
    if (!this.isOnline) {
      logDebug('Skipping broadcast - offline, will queue for later', { listId });
      // Queue the action for later processing
      this.queueOfflineAction(listId, message);
      return;
    }

    const channel = this.channels.get(listId);
    if (!channel) {
      logDebug('No channel found for broadcast', { listId });
      return;
    }

    try {
      const fullMessage: RealtimeMessage = {
        ...message,
        timestamp: new Date().toISOString()
      };

      const { error } = await channel.send({
        type: 'broadcast',
        event: 'shopping_list_update',
        payload: fullMessage
      });

      if (error) {
        logError('Failed to broadcast update', { listId, error });
        // Queue the action for retry
        this.queueOfflineAction(listId, message);
      } else {
        logDebug('Successfully broadcasted update', { listId, message: fullMessage });
      }
    } catch (error) {
      logError('Error broadcasting update', { listId, error });
      // Queue the action for retry
      this.queueOfflineAction(listId, message);
    }
  }

  /**
   * Queue an action for offline processing
   */
  private queueOfflineAction(listId: string, message: Omit<RealtimeMessage, 'timestamp'>): void {
    try {
      const queueKey = 'offline_queue';
      const existingQueue = JSON.parse(localStorage.getItem(queueKey) || '[]');
      
      const queuedAction = {
        id: crypto.randomUUID(),
        ...message,
        timestamp: new Date().toISOString()
      };
      
      existingQueue.push(queuedAction);
      localStorage.setItem(queueKey, JSON.stringify(existingQueue));
      
      logDebug('Queued action for offline processing', { listId, action: queuedAction });
    } catch (error) {
      logError('Failed to queue offline action', { listId, error });
    }
  }

  /**
   * Process offline queue when connection is restored
   */
  private async processOfflineQueue(): Promise<void> {
    try {
      const queueKey = 'offline_queue';
      const queue = JSON.parse(localStorage.getItem(queueKey) || '[]');
      
      if (queue.length === 0) {
        logDebug('No offline actions to process');
        return;
      }

      logInfo('Processing offline queue', { count: queue.length });

      // Clear the queue first
      localStorage.removeItem(queueKey);

      for (const action of queue) {
        try {
          // TODO: Broadcast after all changes are processed. Keep in mind that there may be changes in other lists.
          await this.broadcastUpdate(action.listId, {
            type: action.type,
            listId: action.listId,
            itemId: action.itemId
          });
          logDebug('Successfully processed offline action', { action });
        } catch (error) {
          logError('Failed to process offline action, re-queuing', { action, error });
          // Re-queue failed actions
          this.queueOfflineAction(action.listId, {
            type: action.type,
            listId: action.listId,
            itemId: action.itemId
          });
        }
      }
    } catch (error) {
      logError('Error processing offline queue', { error });
    }
  }

  /**
   * Handle resume from standby
   */
  private handleResumeFromStandby(): void {
    logInfo('Handling resume from standby');
    
    // Check if we're still online
    if (navigator.onLine) {
      this.isOnline = true;
      
      // Process any offline queue
      this.processOfflineQueue();
      
      // Notify listeners
      this.onlineListeners.forEach(listener => listener());
      
      // Check and reconnect channels if needed
      this.checkAndReconnectChannels();
    } else {
      logInfo('Still offline after resume');
    }
  }

  /**
   * Handle going to standby
   */
  private handleGoingToStandby(): void {
    logInfo('Handling going to standby');
    // No special action needed - channels will be maintained
    // If connection is lost, it will be detected and handled
  }

  /**
   * Check and reconnect channels if needed
   */
  private checkAndReconnectChannels(): void {
    this.channels.forEach((channel, listId) => {
      // Check if channel is still active
      if (channel.state !== 'SUBSCRIBED') {
        logInfo('Channel not subscribed, attempting reconnection', { listId });
        // The channel will automatically attempt to reconnect
        // If it fails, it will be handled by the existing reconnection logic
      }
    });
  }

  /**
   * Handle realtime updates from the channel
   */
  private async handleRealtimeUpdate(listId: string, payload: any, onUpdate: () => void): Promise<void> {
    try {
      const message: RealtimeMessage = payload.payload;
      
      if (message.listId !== listId) {
        logDebug('Ignoring update for different list', { 
          receivedListId: message.listId, 
          currentListId: listId 
        });
        return;
      }

      logInfo('Processing realtime update', { listId, message });

      // Trigger UI update - the hook will handle reloading data
      onUpdate();
      
    } catch (error) {
      logError('Error handling realtime update', { listId, error });
    }
  }

  /**
   * Handle disconnection and attempt reconnection
   */
  private handleDisconnect(listId: string, onUpdate: () => void): void {
    const attempts = this.reconnectAttempts.get(listId) || 0;
    
    if (attempts < this.maxReconnectAttempts) {
      logInfo('Attempting to reconnect', { listId, attempt: attempts + 1 });
      
      this.reconnectAttempts.set(listId, attempts + 1);
      
      setTimeout(() => {
        this.attemptReconnect(listId, onUpdate);
      }, this.reconnectDelay * Math.pow(2, attempts)); // Exponential backoff
    } else {
      logError('Max reconnection attempts reached', { listId });
    }
  }

  /**
   * Attempt to reconnect to a channel
   */
  private async attemptReconnect(listId: string, onUpdate: () => void): Promise<void> {
    if (!this.isOnline) {
      logDebug('Skipping reconnection attempt - offline', { listId });
      return;
    }

    try {
      logInfo('Attempting reconnection', { listId });
      
      // Unsubscribe and resubscribe
      this.unsubscribeFromList(listId);
      
      // Wait a bit before resubscribing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Resubscribe
      this.subscribeToList(listId, onUpdate);
      
    } catch (error) {
      logError('Reconnection attempt failed', { listId, error });
    }
  }

  /**
   * Reset reconnection attempts for a list
   */
  private resetReconnectAttempts(listId: string): void {
    this.reconnectAttempts.delete(listId);
  }

  /**
   * Handle online status restoration
   */
  onOnline(callback: () => void): () => void {
    this.onlineListeners.add(callback);
    return () => this.onlineListeners.delete(callback);
  }

  /**
   * Check if currently online
   */
  isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Get all active channels
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  /**
   * Cleanup all channels
   */
  cleanup(): void {
    logInfo('Cleaning up realtime service');
    this.channels.forEach((channel, listId) => {
      this.unsubscribeFromList(listId);
    });
    this.onlineListeners.clear();
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    realtimeService.cleanup();
  });
} 