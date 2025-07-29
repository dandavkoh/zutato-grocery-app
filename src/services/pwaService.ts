// @ts-ignore - virtual:pwa-register is provided by vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';
import { dexieService, type ShoppingItem } from './dexieService';

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
        console.error('❌ PWA: Service Worker Registrierung fehlgeschlagen', error);
        this.notifyUpdate({
          type: 'error',
          message: 'Service Worker Registrierung fehlgeschlagen'
        });
      },
      onUpdateFound: () => {
        console.log('🔄 PWA: Service Worker update found');
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
    
    // Intercept Supabase client requests
    this.setupSupabaseInterceptor();
    
    // Regular database stats logging
    setInterval(() => {
      this.logDatabaseStats().catch(error => {
        console.error('❌ [PWA] Database stats logging failed:', error);
      });
    }, 60 * 60 * 1000); // Every hour

    // Log service worker status after a delay
    setTimeout(async () => {
      const status = await this.getServiceWorkerStatus();
      console.log('🔧 [PWA] Service Worker Status:', status);
    }, 2000);
  }

  private setupFetchInterceptor() {
    // Store original fetch if not already stored
    if (!(window as any)._originalFetch) {
      (window as any)._originalFetch = window.fetch;
    }
    
    const originalFetch = (window as any)._originalFetch;
    
    // Only set up interceptor if not already set up
    if ((window as any)._fetchInterceptorSet) {
      console.log('🔍 [PWA] Fetch interceptor already set up');
      return;
    }
    
    (window as any)._fetchInterceptorSet = true;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      
      // Debug: Log all requests to see what's happening
      console.log(`🔍 [PWA] Checking regular request: ${request.method} ${request.url}`);
      console.log(`🔍 [PWA] URL details:`, {
        hostname: url.hostname,
        pathname: url.pathname,
        search: url.search
      });

      console.log(`🌐 [PWA] Intercepting regular request: ${request.method} ${request.url}`);

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
    const url = new URL(request.url);
    
    // Only handle test_test requests
    if (!url.pathname.includes('test_test')) {
      return originalFetch(request);
    }

    // Check if we're online
    if (navigator.onLine) {
      try {
        // Try network first when online
        const response = await originalFetch(request);
        if (response.ok) {
          // Parse and do stuff
          const items: ShoppingItem[] = await response.clone().json();
          // Do stuff with the itenms
          return response;
        }
      } catch (error) {
        console.log(`📴 [PWA] Network failed, trying Offline: ${request.method} ${request.url}`);
      }
    } else {
      console.log(`📴 [PWA] Offline, trying Offline: ${request.method} ${request.url}`);
    }

    // Try other solution (when offline or network failed)
    // Example: Fetch from local cache storage and return it
    const returnData = {
      items: [
        { id: 1, title: 'Item 1' },
      ]
    };
    return new Response(JSON.stringify(returnData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private extractListIdFromUrl(url: URL): string | null {
    const listIdParam = url.searchParams.get('list_id');
    if (listIdParam && listIdParam.startsWith('eq.')) {
      return listIdParam.substring(3); // Remove 'eq.' prefix
    }
    return listIdParam;
  }

  private extractItemIdFromUrl(url: URL): string | null {
    const itemIdParam = url.searchParams.get('id');
    if (itemIdParam && itemIdParam.startsWith('eq.')) {
      return itemIdParam.substring(3); // Remove 'eq.' prefix
    }
    return itemIdParam;
  }

  private async handleMutationRequest(request: Request, originalFetch: typeof fetch): Promise<Response> {
    const url = new URL(request.url);
    
    // Only handle test_test requests
    if (!url.pathname.includes('test_test')) {
      return originalFetch(request);
    }

    // Check if we're online
    if (navigator.onLine) {
      try {
        // Try network first when online
        const response = await originalFetch(request);
        if (response.ok) {
          console.log(`✅ [PWA] Mutation successful: ${request.method} ${request.url}`);
          return response;
        }
      } catch (error) {
        console.log(`📴 [PWA] Network failed, queuing request: ${request.method} ${request.url}`);
      }
    } else {
      console.log(`📴 [PWA] Offline, queuing request: ${request.method} ${request.url}`);
    }

    // Queue the request for later (when offline or network failed)
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
    
    console.log(`📝 [PWA] Request queued: ${request.method} ${request.url} with body: ${queuedRequest.body}`);
    
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

    // Get current Supabase headers for authentication
    const supabaseHeaders = await this.getSupabaseHeaders();

    const itemsToProcess = [...this.requestQueue];
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of itemsToProcess) {
      try {
        // Create headers with proper content-type for PATCH requests and current Supabase auth
        const headers = new Headers(item.headers);
        
        // Add current Supabase authentication headers
        if (supabaseHeaders) {
          Object.entries(supabaseHeaders).forEach(([key, value]) => {
            headers.set(key, value as string);
          });
        }
        
        if (item.method === 'PATCH' && item.body && !headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }

        const request = new Request(item.url, {
          method: item.method,
          headers: headers,
          body: item.body
        });

        console.log(`🔄 [PWA] Replaying request: ${item.method} ${item.url} with body: ${item.body}`);

        const response = await fetch(request);
        
        if (response.ok) {
          // Handle successful PATCH requests by syncing to Dexie
          if (item.method === 'PATCH' && item.url.includes('shopping_items')) {
            try {
              const updatedItem: ShoppingItem = await response.clone().json();
              await dexieService.updateShoppingItemFromResponse(updatedItem);
              console.log(`✅ [PWA] Synced PATCH response to Dexie: ${item.url}`);
            } catch (syncError) {
              console.error('❌ [PWA] Failed to sync PATCH response to Dexie:', syncError);
            }
          }
          
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

  private async logDatabaseStats(): Promise<void> {
    try {
      const stats = await dexieService.getStats();
      console.log(`📊 [PWA] Database stats: ${stats.total} total, ${stats.active} active, ${stats.deleted} deleted items`);
    } catch (error) {
      console.error('❌ [PWA] Failed to get database stats:', error);
    }
  }

  private async getSupabaseHeaders(): Promise<Record<string, string> | null> {
    try {
      const supabaseClient = (window as any).supabase;
      if (!supabaseClient) {
        console.warn('⚠️ [PWA] Supabase client not available');
        return null;
      }

      // Get current session for authentication
      const { data: { session } } = await supabaseClient.auth.getSession();
      
      const headers: Record<string, string> = {};
      
      // Add API key
      if (supabaseClient.supabaseKey) {
        headers['apikey'] = supabaseClient.supabaseKey;
      }
      
      // Add authorization header if session exists
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      // Add other required Supabase headers
      headers['Content-Type'] = 'application/json';
      headers['Accept'] = 'application/json';
      
      console.log(`🔑 [PWA] Retrieved Supabase headers: ${Object.keys(headers).join(', ')}`);
      return headers;
    } catch (error) {
      console.error('❌ [PWA] Failed to get Supabase headers:', error);
      return null;
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
      // Handle different body types
      if (typeof body === 'string') {
        return body;
      } else if (body instanceof FormData) {
        // Convert FormData to JSON-like structure
        const formDataObj: Record<string, any> = {};
        for (const [key, value] of body.entries()) {
          formDataObj[key] = value;
        }
        return JSON.stringify(formDataObj);
      } else if (body instanceof URLSearchParams) {
        return body.toString();
      } else if (body instanceof ArrayBuffer) {
        return new TextDecoder().decode(body);
      } else if (body instanceof ReadableStream) {
        // For ReadableStream, we need to read it
        const reader = body.getReader();
        const chunks: Uint8Array[] = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            chunks.push(value);
          }
        }
        
        // Combine chunks and decode
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        
        return new TextDecoder().decode(combined);
      } else {
        // For other types, try to convert to string
        return await new Response(body).text();
      }
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

    console.log('✅ PWA: Service Worker is active and ready');
    
    // Check database stats
    this.checkDatabaseStats();

    // Initial queue status check
    this.updateQueueStatus();
  }

  private async checkDatabaseStats() {
    try {
      const stats = await dexieService.getStats();
      console.log('📋 [PWA] Database stats:', stats);
    } catch (error) {
      console.error('❌ [PWA] Failed to check database stats:', error);
    }
  }

  private setupSupabaseInterceptor() {
    // Wait for Supabase client to be available
    const checkSupabase = () => {
      const supabaseClient = (window as any).supabase;
      if (supabaseClient?.rest?.fetch) {
        const originalSupabaseFetch = supabaseClient.rest.fetch;
        
        supabaseClient.rest.fetch = async (...args: any[]) => {
          const [url, options] = args;
          console.log(`🔍 [PWA] Intercepting Supabase client request: ${options?.method || 'GET'} ${url}`);
          
          const isShoppingItemsRequest = url.includes('/rest/v1/') && url.includes('shopping_items');
          
          if (isShoppingItemsRequest && options?.method === 'GET') {
            // Check if we're online
            if (navigator.onLine) {
              // Try network first when online
              try {
                const response = await originalSupabaseFetch(...args);
                if (response.ok) {
                  // Parse and sync response to Dexie
                  const items: ShoppingItem[] = await response.clone().json();
                  await dexieService.syncShoppingItems(items);
                  console.log(`✅ [PWA] Synced Supabase response to Dexie: ${url}`);
                  return response;
                }
              } catch (error) {
                console.log(`📴 [PWA] Network failed, trying Dexie: ${url}`);
              }
            } else {
              console.log(`📴 [PWA] Offline, trying Dexie: ${url}`);
            }
            
            // Try Dexie (when offline or network failed)
            try {
              const urlObj = new URL(url);
              const listId = this.extractListIdFromUrl(urlObj);
              if (listId) {
                const items = await dexieService.getShoppingItemsByListId(listId);
                console.log(`⚡ [PWA] Serving Supabase request from Dexie: ${items.length} items for list ${listId}`);
                return new Response(JSON.stringify(items), {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' }
                });
              }
            } catch (error) {
              console.error('❌ [PWA] Error getting items from Dexie:', error);
            }
          }
          
          // Handle PATCH requests for shopping_items
          if (isShoppingItemsRequest && options?.method === 'PATCH') {
            console.log(`🔄 [PWA] Handling Supabase PATCH request: ${url}`);
            
            // Check if we're online
            if (navigator.onLine) {
              try {
                const response = await originalSupabaseFetch(...args);
                if (response.ok) {
                  console.log(`✅ [PWA] Supabase PATCH successful: ${url}`);
                  return response;
                }
              } catch (error) {
                console.log(`📴 [PWA] Network failed, queuing PATCH request: ${url}`);
              }
            } else {
              console.log(`📴 [PWA] Offline, queuing PATCH request: ${url}`);
            }
            
            // Try optimistic update in Dexie
            try {
              const urlObj = new URL(url);
              const itemId = this.extractItemIdFromUrl(urlObj);
              if (itemId && options.body) {
                const updates = JSON.parse(options.body as string);
                const updatedItem = await dexieService.updateShoppingItemOptimistically(itemId, updates);
                if (updatedItem) {
                  console.log(`⚡ [PWA] Optimistically updated item in Dexie: ${itemId}`);
                }
              }
            } catch (error) {
              console.error('❌ [PWA] Error optimistically updating item:', error);
            }
            
            // Queue the PATCH request for later
            const request = new Request(url, {
              ...options,
              headers: new Headers(options?.headers || {})
            });
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
          
          // For other requests, just make the original request
          const response = await originalSupabaseFetch(...args);
          if (response.ok && isShoppingItemsRequest && options?.method === 'GET') {
            // Parse and sync response to Dexie
            const items: ShoppingItem[] = await response.clone().json();
            await dexieService.syncShoppingItems(items);
            console.log(`✅ [PWA] Synced Supabase response to Dexie: ${url}`);
          }
          return response;
        };
        
        console.log('✅ [PWA] Supabase client interceptor installed');
        return true;
      }
      return false;
    };

    // Try immediately
    if (!checkSupabase()) {
      // If not available, retry after a delay
      setTimeout(() => {
        if (!checkSupabase()) {
          console.log('⚠️ [PWA] Supabase client not found after retry, skipping interceptor');
        }
      }, 1000);
    }
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

  public async getServiceWorkerStatus(): Promise<{
    registered: boolean;
    active: boolean;
    databaseStats: { total: number; active: number; deleted: number };
  }> {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const databaseStats = await dexieService.getStats();
      
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
        databaseStats: { total: 0, active: 0, deleted: 0 }
      };
    }
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

  // Ensure fetch interceptor is active (called when navigating between views)
  public ensureFetchInterceptor(): void {
    console.log('🔍 [PWA] Ensuring fetch interceptor is active');
    this.setupFetchInterceptor();
    this.setupSupabaseInterceptor();
  }
}

// Export singleton instance
export const pwaService = new PWAService(); 