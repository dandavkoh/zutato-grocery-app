import { supabase } from '../config/supabase';
import { logDebug, logError, logInfo } from '../config/environment';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeMessage {
  type: 'item_created' | 'item_updated' | 'item_deleted' | 'item_completed';
  listId: string;
  itemId?: string;
  timestamp: string;
}

type ChannelEntry = {
  channel: RealtimeChannel;
  callbacks: Set<() => void>;
};

class RealtimeService {
  // One channel per listId; multiple listeners per channel
  private channels: Map<string, ChannelEntry> = new Map();
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
   * Multiple callers can subscribe; a single channel is shared.
   */
  subscribeToList(listId: string, onUpdate: () => void): () => void {
    logInfo('Subscribing to list channel', { listId });

    const existing = this.channels.get(listId);
    if (existing) {
      existing.callbacks.add(onUpdate);
      logDebug('Added listener to existing channel', { listId, listeners: existing.callbacks.size });
      return () => this.removeListener(listId, onUpdate);
    }

    // Create new channel with both broadcast and DB change listeners
    const channel = supabase
      .channel(`list-${listId}`)
      // Listen to actual database changes for shopping_items
      .on(
        'postgres_changes',
        { 
          event: '*',  // Listen to INSERT, UPDATE, DELETE
          schema: 'public', 
          table: 'shopping_items',
          filter: `list_id=eq.${listId}`
        },
        (payload) => {
          logInfo('📡 [Realtime] Database change detected:', { 
            event: payload.eventType, 
            listId,
            itemId: (payload.new as any)?.id || (payload.old as any)?.id
          });
          
          // Trigger reload for this list
          this.handleRealtimeUpdate(listId, { 
            payload: { 
              type: `item_${payload.eventType.toLowerCase()}` as RealtimeMessage['type'],
              listId: listId,
              itemId: (payload.new as any)?.id || (payload.old as any)?.id,
              timestamp: new Date().toISOString()
            }
          });
        }
      )
      // Listen to database changes for lists table
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'lists',
          filter: `id=eq.${listId}`
        },
        (payload) => {
          logInfo('📡 [Realtime] List metadata changed:', { 
            event: payload.eventType, 
            listId
          });
          
          // Trigger list reload
          this.handleRealtimeUpdate(listId, { 
            payload: { 
              type: `item_updated` as RealtimeMessage['type'],
              listId: listId,
              timestamp: new Date().toISOString()
            }
          });
        }
      )
      // Keep existing broadcast listener for immediate optimistic updates
      .on('broadcast', { event: 'shopping_list_update' }, (payload: { type: 'broadcast'; event: string; payload: RealtimeMessage }) => {
        logDebug('Received realtime update', { listId, payload });
        this.handleRealtimeUpdate(listId, payload);
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
        // Let Supabase handle reconnection automatically
      })
      .on('system', { event: 'reconnect' }, () => {
        logInfo('Realtime connection restored', { listId });
      });

    // Subscribe to the channel
    channel.subscribe((status) => {
      logDebug('Channel subscription status', { listId, status });
      if (status === 'SUBSCRIBED') {
        logInfo('Successfully subscribed to list channel', { listId });
      } else if (status === 'CHANNEL_ERROR') {
        logError('Channel subscription error', { listId });
      }
    });

    // Store the channel with initial listener
    const entry: ChannelEntry = { channel, callbacks: new Set([onUpdate]) };
    this.channels.set(listId, entry);

    // Return unsubscribe function for this listener
    return () => this.removeListener(listId, onUpdate);
  }

  /** Remove a single listener; if none remain, tear down the channel */
  private removeListener(listId: string, onUpdate: () => void): void {
    const entry = this.channels.get(listId);
    if (!entry) return;
    entry.callbacks.delete(onUpdate);
    logDebug('Removed listener from channel', { listId, listeners: entry.callbacks.size });
    if (entry.callbacks.size === 0) {
      this.unsubscribeFromList(listId);
    }
  }

  /**
   * Unsubscribe from a shopping list channel
   */
  unsubscribeFromList(listId: string): void {
    const entry = this.channels.get(listId);
    if (entry) {
      logInfo('Unsubscribing from list channel', { listId });
      supabase.removeChannel(entry.channel);
      this.channels.delete(listId);
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

    const entry = this.channels.get(listId);
    if (!entry) {
      logDebug('No channel found for broadcast', { listId });
      return;
    }

    try {
      const fullMessage: RealtimeMessage = {
        ...message,
        timestamp: new Date().toISOString()
      };

      const response = await entry.channel.send({
        type: 'broadcast',
        event: 'shopping_list_update',
        payload: fullMessage
      });

      if (response === 'error' || response === 'timed out') {
        logError('Failed to broadcast update', { listId, response });
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
    this.channels.forEach((entry, listId) => {
      // Supabase handles reconnection internally; just log state if available
      const state = (entry.channel as any)?.state;
      if (state && state !== 'SUBSCRIBED') {
        logInfo('Channel state', { listId, state });
      }
    });
  }

  /**
   * Handle realtime updates from the channel
   */
  private async handleRealtimeUpdate(listId: string, payload: { payload: RealtimeMessage }): Promise<void> {
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
      this.dispatchUpdate(listId);
      
    } catch (error) {
      logError('Error handling realtime update', { listId, error });
    }
  }

  /** Notify all listeners for a listId */
  private dispatchUpdate(listId: string): void {
    const entry = this.channels.get(listId);
    if (!entry) return;
    entry.callbacks.forEach(cb => {
      try { 
        cb(); 
      } catch (e) { 
        logError('Listener callback error', e as Error); 
      }
    });
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