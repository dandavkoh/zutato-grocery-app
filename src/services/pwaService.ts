// @ts-ignore - virtual:pwa-register is provided by vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';

export interface PWAUpdateEvent {
  type: 'update' | 'offline' | 'online' | 'queue_processed';
  message: string;
  data?: any;
}

export interface QueueStatus {
  queueLength: number;
  isProcessing: boolean;
}

class PWAService {
  private updateSW: (() => Promise<void>) | undefined;
  private updateCallback: ((event: PWAUpdateEvent) => void) | undefined;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private queueStatus: QueueStatus = { queueLength: 0, isProcessing: false };

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Register service worker
    this.updateSW = registerSW({
      onNeedRefresh: () => {
        console.log('🔄 PWA: Update available');
        this.notifyUpdate({
          type: 'update',
          message: 'Eine neue Version ist verfügbar. Klicke hier, um zu aktualisieren.'
        });
      },
      onOfflineReady: () => {
        console.log('📱 PWA: App ist offline bereit');
        this.notifyUpdate({
          type: 'offline',
          message: 'App ist jetzt offline verfügbar'
        });
      },
      onRegistered: (swRegistration: any) => {
        console.log('✅ PWA: Service Worker registriert', swRegistration);
        this.swRegistration = swRegistration;
        this.setupServiceWorkerCommunication();
        
        // Registriere zusätzlichen Service Worker für Offline-API-Funktionalität
        this.registerOfflineServiceWorker();
      },
      onRegisterError: (error: any) => {
        console.error('❌ PWA: Service Worker Registrierung fehlgeschlagen', error);
      }
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 PWA: Online');
      this.notifyUpdate({
        type: 'online',
        message: 'Verbindung wiederhergestellt'
      });
      this.processQueuedRequests();
    });

    window.addEventListener('offline', () => {
      console.log('📴 PWA: Offline');
      this.notifyUpdate({
        type: 'offline',
        message: 'Keine Internetverbindung'
      });
    });

    // Service Worker Message Handler
    navigator.serviceWorker?.addEventListener('message', (event) => {
      const { type, count } = event.data;
      
      if (type === 'QUEUE_PROCESSED') {
        console.log(`✅ PWA: ${count} queued requests processed`);
        this.notifyUpdate({
          type: 'queue_processed',
          message: `${count} Offline-Requests wurden verarbeitet`,
          data: { count }
        });
        this.updateQueueStatus();
      }
    });
  }

  private setupServiceWorkerCommunication() {
    if (!this.swRegistration?.active) {
      console.log('⚠️ PWA: Service Worker not active yet');
      return;
    }

    // Initial queue status check
    this.updateQueueStatus();
  }

  private async updateQueueStatus() {
    if (!this.swRegistration?.active) return;

    try {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        this.queueStatus = event.data;
        console.log(`📊 PWA: Queue status updated - ${this.queueStatus.queueLength} items, processing: ${this.queueStatus.isProcessing}`);
      };

      this.swRegistration.active.postMessage(
        { type: 'GET_QUEUE_STATUS' },
        [channel.port2]
      );
    } catch (error) {
      console.error('❌ PWA: Failed to get queue status:', error);
    }
  }

  public async processQueuedRequests(): Promise<void> {
    if (!this.swRegistration?.active) {
      console.log('⚠️ PWA: Service Worker not active');
      return;
    }

    try {
      this.swRegistration.active.postMessage({ type: 'PROCESS_QUEUE' });
      console.log('🔄 PWA: Requested queue processing');
    } catch (error) {
      console.error('❌ PWA: Failed to process queue:', error);
    }
  }

  public async clearQueuedRequests(): Promise<void> {
    if (!this.swRegistration?.active) {
      console.log('⚠️ PWA: Service Worker not active');
      return;
    }

    try {
      this.swRegistration.active.postMessage({ type: 'CLEAR_QUEUE' });
      console.log('🗑️ PWA: Requested queue clearing');
      this.queueStatus = { queueLength: 0, isProcessing: false };
    } catch (error) {
      console.error('❌ PWA: Failed to clear queue:', error);
    }
  }

  public getQueueStatus(): QueueStatus {
    return { ...this.queueStatus };
  }

  public hasQueuedRequests(): boolean {
    return this.queueStatus.queueLength > 0;
  }

  private async registerOfflineServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        console.log('✅ PWA: Offline Service Worker registriert', registration);
      } catch (error) {
        console.error('❌ PWA: Offline Service Worker Registrierung fehlgeschlagen', error);
      }
    }
  }

  public setUpdateCallback(callback: (event: PWAUpdateEvent) => void) {
    this.updateCallback = callback;
  }

  private notifyUpdate(event: PWAUpdateEvent) {
    if (this.updateCallback) {
      this.updateCallback(event);
    }
  }

  public async updateApp(): Promise<void> {
    if (this.updateSW) {
      try {
        await this.updateSW();
        console.log('✅ PWA: App erfolgreich aktualisiert');
      } catch (error) {
        console.error('❌ PWA: Update fehlgeschlagen', error);
      }
    }
  }

  public isOnline(): boolean {
    return navigator.onLine;
  }

  public async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('❌ PWA: Notifications nicht unterstützt');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.log('❌ PWA: Notifications verweigert');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('❌ PWA: Notification Permission Request fehlgeschlagen', error);
      return false;
    }
  }

  public showNotification(title: string, options?: NotificationOptions): void {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        ...options
      });
    }
  }

  public async installPrompt(): Promise<void> {
    // This would be used for custom install prompts
    // For now, we rely on the browser's native install prompt
    console.log('📱 PWA: Install prompt requested');
  }
}

// Export singleton instance
export const pwaService = new PWAService(); 