// @ts-ignore - virtual:pwa-register is provided by vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';

export interface PWAUpdateEvent {
  type: 'update' | 'offline' | 'online' | 'queue_processed' | 'error';
  message: string;
  data?: any;
}

export interface QueueStatus {
  queueLength: number;
  isProcessing: boolean;
}

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
}

class PWAService {
  private updateSW: (() => Promise<void>) | undefined;
  private updateCallback: ((event: PWAUpdateEvent) => void) | undefined;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private queueStatus: QueueStatus = { queueLength: 0, isProcessing: false };
  private requestQueue: QueuedRequest[] = [];
  private isProcessingQueue = false;
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.initialize();
    this.loadQueueFromStorage();
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
      onRegistered: (swRegistration: ServiceWorkerRegistration) => {
        console.log('✅ PWA: Service Worker registriert', swRegistration);
        this.swRegistration = swRegistration;
        this.setupServiceWorkerCommunication();
      },
      onRegisterError: (error: Error) => {
        console.error('❌ PWA: Service Worker Registrierung fehlgeschlagen', error);
        this.notifyUpdate({
          type: 'error',
          message: 'Service Worker Registrierung fehlgeschlagen'
        });
      }
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 PWA: Online');
      this.notifyUpdate({
        type: 'online',
        message: 'Verbindung wiederhergestellt'
      });
      this.processQueuedRequestsInternal();
    });

    window.addEventListener('offline', () => {
      console.log('📴 PWA: Offline');
      this.notifyUpdate({
        type: 'offline',
        message: 'Keine Internetverbindung'
      });
    });

    // Intercept fetch requests for offline functionality
    this.setupFetchInterceptor();
    
    // Regular cache cleanup
    setInterval(() => {
      this.cleanupOldCache().catch(error => {
        console.error('❌ [PWA] Cache cleanup failed:', error);
      });
    }, 60 * 60 * 1000); // Every hour
  }

  private setupFetchInterceptor() {
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      
      // Only intercept API requests
      if (!url.pathname.startsWith('/api/shopping-items')) {
        return originalFetch(request);
      }

      console.log(`🌐 [PWA] Intercepting API request: ${request.method} ${request.url}`);

      // GET requests: try network first, then cache
      if (request.method === 'GET') {
        return this.handleGetRequest(request, originalFetch);
      }
      
      // Mutation requests: try network first, then queue
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        return this.handleMutationRequest(request, originalFetch);
      }

      return originalFetch(request);
    };
  }

  private async handleGetRequest(request: Request, originalFetch: typeof fetch): Promise<Response> {
    try {
      // Try network first
      const response = await originalFetch(request);
      if (response.ok) {
        // Cache successful responses
        await this.cacheResponse(request, response.clone());
        console.log(`✅ [PWA] Network response cached: ${request.method} ${request.url}`);
        return response;
      }
    } catch (error) {
      console.log(`📴 [PWA] Network failed, trying cache: ${request.method} ${request.url}`);
    }

    // Try cache
    const cachedResponse = await this.getCachedResponse(request);
    if (cachedResponse) {
      console.log(`⚡ [PWA] Serving from cache: ${request.method} ${request.url}`);
      return cachedResponse;
    }

    // No cache available
    console.log(`❌ [PWA] No cache available: ${request.method} ${request.url}`);
    return new Response(JSON.stringify({ 
      error: 'Offline - Keine Daten verfügbar',
      offline: true 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleMutationRequest(request: Request, originalFetch: typeof fetch): Promise<Response> {
    try {
      // Try network first
      const response = await originalFetch(request);
      if (response.ok) {
        console.log(`✅ [PWA] Mutation successful: ${request.method} ${request.url}`);
        await this.invalidateRelatedCaches(request);
        return response;
      }
    } catch (error) {
      console.log(`📴 [PWA] Network failed, queuing request: ${request.method} ${request.url}`);
    }

    // Queue the request for later
    await this.queueRequest(request);
    
    // Return optimistic response
    return new Response(JSON.stringify({ 
      success: true, 
      queued: true,
      message: 'Request wird verarbeitet wenn Online-Verbindung verfügbar ist'
    }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async queueRequest(request: Request): Promise<void> {
    // Check queue size limit
    if (this.requestQueue.length >= this.MAX_QUEUE_SIZE) {
      console.warn('⚠️ [PWA] Queue limit reached, dropping oldest request');
      this.requestQueue.shift();
    }

    const queuedRequest: QueuedRequest = {
      id: Date.now() + Math.random().toString(),
      url: request.url,
      method: request.method,
      headers: this.serializeHeaders(request.headers),
      body: request.body ? await this.cloneBody(request.body) : null,
      timestamp: Date.now()
    };

    this.requestQueue.push(queuedRequest);
    this.queueStatus.queueLength = this.requestQueue.length;
    await this.saveQueueToStorage();
    
    console.log(`📝 [PWA] Request queued: ${request.method} ${request.url}`);
    
    // Try to process queue if online
    if (navigator.onLine) {
      this.processQueuedRequestsInternal();
    }
  }

  private async processQueuedRequestsInternal(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0 || !navigator.onLine) {
      return;
    }

    this.isProcessingQueue = true;
    this.queueStatus.isProcessing = true;
    console.log(`🔄 [PWA] Processing ${this.requestQueue.length} queued requests...`);

    const itemsToProcess = [...this.requestQueue];
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of itemsToProcess) {
      try {
        const request = new Request(item.url, {
          method: item.method,
          headers: new Headers(item.headers),
          body: item.body
        });

        const response = await fetch(request);
        
        if (response.ok) {
          this.requestQueue = this.requestQueue.filter(req => req.id !== item.id);
          successCount++;
          console.log(`✅ [PWA] Queued request successful: ${item.method} ${item.url}`);
        } else {
          errorCount++;
          console.warn(`⚠️ [PWA] Queued request failed: ${item.method} ${item.url}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ [PWA] Queued request error: ${item.method} ${item.url}`, error);
      }
    }

    this.queueStatus.queueLength = this.requestQueue.length;
    this.queueStatus.isProcessing = false;
    this.isProcessingQueue = false;
    await this.saveQueueToStorage();
    
    // Notify about processed queue
    this.notifyUpdate({
      type: 'queue_processed',
      message: `${successCount} von ${itemsToProcess.length} Offline-Requests wurden verarbeitet${errorCount > 0 ? ` (${errorCount} Fehler)` : ''}`,
      data: { successCount, errorCount, totalCount: itemsToProcess.length }
    });
  }

  private async cacheResponse(request: Request, response: Response): Promise<void> {
    try {
      const cache = await caches.open('shopping-items-api-cache');
      await cache.put(request, response);
    } catch (error) {
      console.error('❌ [PWA] Failed to cache response:', error);
      this.notifyUpdate({
        type: 'error',
        message: 'Cache-Fehler aufgetreten'
      });
    }
  }

  private async getCachedResponse(request: Request): Promise<Response | null> {
    try {
      const cache = await caches.open('shopping-items-api-cache');
      const response = await cache.match(request);
      return response || null;
    } catch (error) {
      console.error('❌ [PWA] Failed to get cached response:', error);
      return null;
    }
  }

  private async invalidateRelatedCaches(request: Request): Promise<void> {
    try {
      const cache = await caches.open('shopping-items-api-cache');
      const keys = await cache.keys();
      const relatedKeys = keys.filter(key => {
        const keyUrl = new URL(key.url);
        return keyUrl.pathname.startsWith('/api/shopping-items');
      });
      
      await Promise.all(relatedKeys.map(key => cache.delete(key)));
      console.log(`🗑️ [PWA] Invalidated ${relatedKeys.length} cache entries`);
    } catch (error) {
      console.error('❌ [PWA] Failed to invalidate caches:', error);
    }
  }

  private async cleanupOldCache(): Promise<void> {
    try {
      const cache = await caches.open('shopping-items-api-cache');
      const keys = await cache.keys();
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const key of keys) {
        const response = await cache.match(key);
        if (response) {
          const date = response.headers.get('date');
          if (date && (now - new Date(date).getTime()) > this.CACHE_DURATION) {
            await cache.delete(key);
            cleanedCount++;
          }
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`🧹 [PWA] Cleaned ${cleanedCount} old cache entries`);
      }
    } catch (error) {
      console.error('❌ [PWA] Cache cleanup failed:', error);
    }
  }

  private serializeHeaders(headers: Headers): Record<string, string> {
    const serialized: Record<string, string> = {};
    headers.forEach((value, key) => {
      serialized[key] = value;
    });
    return serialized;
  }

  private async cloneBody(body: BodyInit): Promise<string | null> {
    if (!body) return null;
    try {
      const clone = body instanceof ReadableStream ? body : new ReadableStream();
      return await new Response(clone).text();
    } catch (error) {
      console.error('❌ [PWA] Failed to clone body:', error);
      return null;
    }
  }

  private async saveQueueToStorage(): Promise<void> {
    try {
      localStorage.setItem('offline-request-queue', JSON.stringify(this.requestQueue));
    } catch (error) {
      console.error('❌ [PWA] Failed to save queue to storage:', error);
      this.notifyUpdate({
        type: 'error',
        message: 'Queue-Speicherung fehlgeschlagen'
      });
    }
  }

  private async loadQueueFromStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem('offline-request-queue');
      if (stored) {
        this.requestQueue = JSON.parse(stored);
        this.queueStatus.queueLength = this.requestQueue.length;
        console.log(`📊 [PWA] Loaded ${this.requestQueue.length} queued requests from storage`);
      }
    } catch (error) {
      console.error('❌ [PWA] Failed to load queue from storage:', error);
      this.requestQueue = [];
    }
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
    // Queue status is now managed locally
    this.queueStatus = {
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessingQueue
    };
  }

  public async processQueuedRequests(): Promise<void> {
    await this.processQueuedRequestsInternal();
  }

  public async clearQueuedRequests(): Promise<void> {
    this.requestQueue = [];
    this.queueStatus = { queueLength: 0, isProcessing: false };
    await this.saveQueueToStorage();
    console.log('🗑️ PWA: Queue cleared');
  }

  public getQueueStatus(): QueueStatus {
    return { ...this.queueStatus };
  }

  public hasQueuedRequests(): boolean {
    return this.queueStatus.queueLength > 0;
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
        this.notifyUpdate({
          type: 'error',
          message: 'App-Update fehlgeschlagen'
        });
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