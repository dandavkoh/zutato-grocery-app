// @ts-ignore - virtual:pwa-register is provided by vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';
import { dexieService } from './dexieService';
import { globalQueueService } from './globalQueueService';

export interface PWAUpdateEvent {
  type: 'update' | 'offline' | 'online' | 'queue_processed' | 'error';
  message: string;
  data?: any;
}

class PWAService {
  private updateSW: (() => Promise<void>) | undefined;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private static instance: PWAService | null = null;
  private static isInitialized = false;
  private updateAvailable = false; // Track if update is available

  constructor() {
    if (PWAService.instance) {
      return PWAService.instance;
    }
    
    if (PWAService.isInitialized) {
      return PWAService.instance!;
    }
    
    PWAService.instance = this;
    PWAService.isInitialized = true;
    this.initialize();
  }

  private initialize() {
    // Register service worker
    this.updateSW = registerSW({
      onNeedRefresh: () => {
        console.log('🔄 PWA: Update available');
        this.updateAvailable = true;
      },
      onOfflineReady: () => {
        console.log('📱 PWA: App is offline ready');
      },
      onRegistered: (swRegistration: ServiceWorkerRegistration) => {
        console.log('✅ PWA: Service Worker registered', swRegistration);
        this.swRegistration = swRegistration;
        
        // Check if service worker is active
        if (swRegistration.active) {
          console.log('✅ PWA: Service Worker is active');
          this.setupServiceWorkerCommunication();
        } else {
          console.log('⏳ PWA: Service Worker is installing/activating');
          // Wait for service worker to become active
          swRegistration.addEventListener('updatefound', () => {
            const newWorker = swRegistration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'activated') {
                  console.log('✅ PWA: Service Worker activated');
                  this.setupServiceWorkerCommunication();
                }
              });
            }
          });
        }
      },
      onRegisterError: (error: Error) => {
        console.error('❌ PWA: Service Worker registration failed', error);
      },
      onUpdateFound: () => {
        console.log('🔄 PWA: Service Worker update found');
      }
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 PWA: Online');
      globalQueueService.processQueuedRequests();
    });

    window.addEventListener('offline', () => {
      console.log('📴 PWA: Offline');
    });

    // Log service worker status after a delay
    setTimeout(async () => {
      const status = await this.getServiceWorkerStatus();
      console.log('🔧 [PWA] Service Worker Status:', status);
    }, 2000);
  }

  private setupServiceWorkerCommunication() {
    if (!this.swRegistration?.active) {
      console.log('⚠️ PWA: Service Worker not active yet');
      return;
    }

    console.log('✅ PWA: Service Worker is active and ready');
  }

  public async processQueuedRequests(): Promise<void> {
    await globalQueueService.processQueuedRequests();
  }

  public async clearQueuedRequests(): Promise<void> {
    await globalQueueService.clearQueuedRequests();
    console.log('🗑️ PWA: Queue cleared');
  }

  public async getQueueStatus(): Promise<{ queueLength: number; isProcessing: boolean }> {
    return await globalQueueService.getQueueStatus();
  }

  public async updateApp(): Promise<void> {
    if (this.updateSW) {
      try {
        await this.updateSW();
        console.log('✅ PWA: App successfully updated');
      } catch (error) {
        console.error('❌ PWA: Update failed', error);
      }
    }
  }

  public isOnline(): boolean {
    return navigator.onLine;
  }

  public isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }

  public async getServiceWorkerStatus(): Promise<{
    registered: boolean;
    active: boolean;
    databaseStats: { total: number; active: number; deleted: number; queuedRequests: number };
  }> {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const databaseStats = await dexieService.getFullStats();
      
      return {
        registered: !!registration,
        active: !!registration?.active,
        databaseStats
      };
    } catch (error) {
      console.error('❌ [PWA] Failed to get service worker status:', error);
      return {
        registered: false,
        active: false,
        databaseStats: { total: 0, active: 0, deleted: 0, queuedRequests: 0 }
      };
    }
  }

  public async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('❌ PWA: Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.log('❌ PWA: Notifications denied');
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

  // Note: Fetch interceptor is now handled by globalServiceManager
  // This method is kept for backward compatibility but does nothing
  public ensureFetchInterceptor(): void {
    console.log('ℹ️ PWA: Fetch interceptor is now handled by globalServiceManager');
  }
}

// Export singleton instance
export const pwaService = new PWAService();