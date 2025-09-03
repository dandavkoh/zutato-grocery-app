// @ts-ignore - virtual:pwa-register is provided by vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';
import { dexieService, type ShoppingItem, type QueuedRequest, type List, type Category, type Unit } from './dexieService';

export interface PWAUpdateEvent {
  type: 'update' | 'offline' | 'online' | 'queue_processed' | 'error';
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
  private isProcessingQueue = false;
  private readonly MAX_QUEUE_SIZE = 1000;
  private readonly REQUEST_TIMEOUT = 1500; // 1.5 seconds
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
    this.loadQueueFromDexie();
  }

  /**
   * Executes a fetch request with a timeout
   * @param fetchFn - The fetch function to execute
   * @param args - Arguments to pass to the fetch function
   * @returns Promise that resolves with the response or rejects with timeout error
   */
  private async executeWithTimeout(fetchFn: (...args: any[]) => Promise<Response>, ...args: any[]): Promise<Response> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), this.REQUEST_TIMEOUT);
    });
    
    return Promise.race([fetchFn(...args), timeoutPromise]);
  }

  private initialize() {
    // Register service worker
    this.updateSW = registerSW({
      onNeedRefresh: () => {
        console.log('🔄 PWA: Update available');
        this.updateAvailable = true;
      },
      onOfflineReady: () => {
        console.log('📱 PWA: App ist offline bereit');
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
      },
      onUpdateFound: () => {
        console.log('🔄 PWA: Service Worker update found');
      }
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 PWA: Online');
      this.processQueuedRequestsInternal();
    });

    window.addEventListener('offline', () => {
      console.log('📴 PWA: Offline');
    });

    // Intercept fetch requests for offline functionality
    //this.setupFetchInterceptor();
    
    // Intercept Supabase client requests (only if not already done)
    if (!globalInterceptorInstalled) {
      this.setupSupabaseInterceptor();
      globalInterceptorInstalled = true;
    }
    
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
    const currentCount = await dexieService.getQueuedRequestsCount();
    if (currentCount >= this.MAX_QUEUE_SIZE) {
      console.warn('⚠️ [PWA] Queue limit reached, dropping oldest request');
      // Get all requests and remove the oldest one
      const allRequests = await dexieService.getAllQueuedRequests();
      if (allRequests.length > 0) {
        await dexieService.removeQueuedRequest(allRequests[0].id);
      }
    }

    const queuedRequest: QueuedRequest = {
      id: Date.now() + Math.random().toString(),
      url: request.url,
      method: request.method,
      headers: this.serializeHeaders(request.headers),
      body: request.body ? await this.cloneBody(request.body) : null,
      timestamp: Date.now()
    };

    await dexieService.addQueuedRequest(queuedRequest);
    this.queueStatus.queueLength = await dexieService.getQueuedRequestsCount();
    
    console.log(`📝 [PWA] Request queued: ${request.method} ${request.url} with body: ${queuedRequest.body}`);
    
    // Try to process queue if online
    if (navigator.onLine) {
      this.processQueuedRequestsInternal();
    }
  }

  private async processQueuedRequestsInternal(): Promise<void> {
    const queueCount = await dexieService.getQueuedRequestsCount();
    if (this.isProcessingQueue || queueCount === 0 || !navigator.onLine) {
      return;
    }

    this.isProcessingQueue = true;
    this.queueStatus.isProcessing = true;
    console.log(`🔄 [PWA] Processing ${queueCount} queued requests...`);

    // Get current Supabase headers for authentication
    const supabaseHeaders = await this.getSupabaseHeaders();

    const itemsToProcess = await dexieService.getAllQueuedRequests();
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
          
          await dexieService.removeQueuedRequest(item.id);
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

    this.queueStatus.queueLength = await dexieService.getQueuedRequestsCount();
    this.queueStatus.isProcessing = false;
    this.isProcessingQueue = false;
    
    // Queue processing completed (no notification)
  }

  private async logDatabaseStats(): Promise<void> {
    try {
      const stats = await dexieService.getFullStats();
      console.log(`📊 [PWA] Database stats: ${stats.total} total, ${stats.active} active, ${stats.deleted} deleted items, ${stats.queuedRequests} queued requests`);
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

  private async loadQueueFromDexie(): Promise<void> {
    try {
      const queueCount = await dexieService.getQueuedRequestsCount();
      this.queueStatus.queueLength = queueCount;
      console.log(`📊 [PWA] Loaded ${queueCount} queued requests from Dexie`);
    } catch (error) {
      console.error('❌ [PWA] Failed to load queue from Dexie:', error);
      this.queueStatus.queueLength = 0;
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
      const stats = await dexieService.getFullStats();
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
        // Check if we've already intercepted this fetch function
        if ((supabaseClient.rest.fetch as any)._pwaIntercepted) {
          console.log('🔍 [PWA] Supabase interceptor already installed, skipping');
          return true; // Already intercepted
        }
        
        const originalSupabaseFetch = supabaseClient.rest.fetch;
        
        // Mark the original function as intercepted BEFORE replacing it
        (originalSupabaseFetch as any)._pwaIntercepted = true;
        
        supabaseClient.rest.fetch = async (...args: any[]) => {
          // Ensure args is properly structured
          if (!Array.isArray(args) || args.length < 1) {
            console.error('❌ [PWA] Invalid args structure:', args);
            return originalSupabaseFetch(...args); //return this.executeWithTimeout(originalSupabaseFetch, ...args);
          }
          
          const [url, options] = args;
          
          // Add request ID to prevent duplicate processing
          const requestId = `${options?.method || 'GET'}_${url}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          console.log(`🔍 [PWA] Intercepting Supabase client request: ${options?.method || 'GET'} ${url} [ID: ${requestId}]`);
          
          // Process queued requests first if we're online and queue is not empty
          if (navigator.onLine) {
            const queueCount = await dexieService.getQueuedRequestsCount();
            if (queueCount > 0) {
              console.log(`🔄 [PWA] Queue has ${queueCount} items, processing before handling new request`);
              
              // If queue is already being processed, wait for it to complete
              if (this.isProcessingQueue) {
                console.log(`⏳ [PWA] Queue is already being processed, waiting for completion...`);
                while (this.isProcessingQueue) {
                  await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
                }
                console.log(`✅ [PWA] Queue processing completed, continuing with new request`);
              } else {
                // Start processing the queue
                console.log(`🔄 [PWA] Starting queue processing for ${queueCount} items`);
                await this.processQueuedRequestsInternal();
              }
            }
          }
          
          const isShoppingItemsRequest = url.includes('/rest/v1/') && url.includes('shopping_items');
          const isListsRequest = url.includes('/rest/v1/') && url.includes('lists');
          const isCategoriesRequest = url.includes('/rest/v1/') && url.includes('grocery_categories');
          const isUnitsRequest = url.includes('/rest/v1/') && url.includes('grocery_units');
          
          // Handle GET requests for shopping_items (load all items)
          if (isShoppingItemsRequest && options?.method === 'GET') {
            // Check if we're online
            if (navigator.onLine) {
              // Try network first when online
              try {
                const response = await this.executeWithTimeout(originalSupabaseFetch, ...args);
                if (response.ok) {
                  // Parse and sync response to Dexie
                  const responseData = await response.clone().json();
                  
                  // Check if response is an array or single object
                  if (Array.isArray(responseData)) {
                    await dexieService.syncShoppingItems(responseData);
                    console.log(`✅ [PWA] Synced Supabase response to Dexie: ${responseData.length} items`);
                  } else {
                    console.log(`⚠️ [PWA] Shopping items response is not an array, skipping Dexie sync: ${url}`);
                  }
                  return response;
                }
              } catch (error) {
                if (error instanceof Error && error.message === 'Request timeout') {
                  console.log(`⏰ [PWA] Request timeout (${this.REQUEST_TIMEOUT}ms), trying Dexie: ${url}`);
                } else {
                  console.log(`📴 [PWA] Network failed, trying Dexie: ${url}`);
                }
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
          
          // Handle GET requests for lists (load all lists)
          if (isListsRequest && options?.method === 'GET') {
            // Check if we're online
            if (navigator.onLine) {
              // Try network first when online
              try {
                const response = await this.executeWithTimeout(originalSupabaseFetch, ...args);
                if (response.ok) {
                  // Parse and sync response to Dexie
                  const responseData = await response.clone().json();
                  
                  // Check if response is an array or single object
                  if (Array.isArray(responseData)) {
                    await dexieService.syncLists(responseData);
                    console.log(`✅ [PWA] Synced Supabase lists response to Dexie: ${responseData.length} lists`);
                  } else {
                    console.log(`⚠️ [PWA] Lists response is not an array, skipping Dexie sync: ${url}`);
                  }
                  return response;
                }
              } catch (error) {
                if (error instanceof Error && error.message === 'Request timeout') {
                  console.log(`⏰ [PWA] Request timeout (${this.REQUEST_TIMEOUT}ms), trying Dexie for lists: ${url}`);
                } else {
                  console.log(`📴 [PWA] Network failed, trying Dexie for lists: ${url}`);
                }
              }
            } else {
              console.log(`📴 [PWA] Offline, trying Dexie for lists: ${url}`);
            }
            
            // Try Dexie (when offline or network failed)
            try {
              // Debug: Check what's in the database
              await dexieService.debugAllLists();
              
              const lists = await dexieService.getAllLists();
              console.log(`⚡ [PWA] Serving Supabase lists request from Dexie: ${lists.length} lists`);
              return new Response(JSON.stringify(lists), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              });
            } catch (error) {
              console.error('❌ [PWA] Error getting lists from Dexie:', error);
            }
          }
          
          // Handle GET requests for categories (load all categories)
          if (isCategoriesRequest && options?.method === 'GET') {
            // Check if we're online
            if (navigator.onLine) {
              // Try network first when online
              try {
                const response = await this.executeWithTimeout(originalSupabaseFetch, ...args);
                if (response.ok) {
                  // Parse and sync response to Dexie
                  const responseData = await response.clone().json();
                  
                  // Check if response is an array or single object
                  if (Array.isArray(responseData)) {
                    await dexieService.syncCategories(responseData);
                    console.log(`✅ [PWA] Synced Supabase categories response to Dexie: ${responseData.length} categories`);
                  } else {
                    console.log(`⚠️ [PWA] Categories response is not an array, skipping Dexie sync: ${url}`);
                  }
                  return response;
                }
              } catch (error) {
                if (error instanceof Error && error.message === 'Request timeout') {
                  console.log(`⏰ [PWA] Request timeout (${this.REQUEST_TIMEOUT}ms), trying Dexie for categories: ${url}`);
                } else {
                  console.log(`📴 [PWA] Network failed, trying Dexie for categories: ${url}`);
                }
              }
            } else {
              console.log(`📴 [PWA] Offline, trying Dexie for categories: ${url}`);
            }
            
            // Try Dexie (when offline or network failed)
            try {
              const categories = await dexieService.getAllCategories();
              console.log(`⚡ [PWA] Serving Supabase categories request from Dexie: ${categories.length} categories`);
              return new Response(JSON.stringify(categories), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              });
            } catch (error) {
              console.error('❌ [PWA] Error getting categories from Dexie:', error);
            }
          }
          
          // Handle GET requests for units (load all units)
          if (isUnitsRequest && options?.method === 'GET') {
            // Check if we're online
            if (navigator.onLine) {
              // Try network first when online
              try {
                const response = await this.executeWithTimeout(originalSupabaseFetch, ...args);
                if (response.ok) {
                  // Parse and sync response to Dexie
                  const responseData = await response.clone().json();
                  
                  // Check if response is an array or single object
                  if (Array.isArray(responseData)) {
                    await dexieService.syncUnits(responseData);
                    console.log(`✅ [PWA] Synced Supabase units response to Dexie: ${responseData.length} units`);
                  } else {
                    console.log(`⚠️ [PWA] Units response is not an array, skipping Dexie sync: ${url}`);
                  }
                  return response;
                }
              } catch (error) {
                if (error instanceof Error && error.message === 'Request timeout') {
                  console.log(`⏰ [PWA] Request timeout (${this.REQUEST_TIMEOUT}ms), trying Dexie for units: ${url}`);
                } else {
                  console.log(`📴 [PWA] Network failed, trying Dexie for units: ${url}`);
                }
              }
            } else {
              console.log(`📴 [PWA] Offline, trying Dexie for units: ${url}`);
            }
            
            // Try Dexie (when offline or network failed)
            try {
              const units = await dexieService.getAllUnits();
              console.log(`⚡ [PWA] Serving Supabase units request from Dexie: ${units.length} units`);
              return new Response(JSON.stringify(units), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              });
            } catch (error) {
              console.error('❌ [PWA] Error getting units from Dexie:', error);
            }
          }
          
          // Handle POST requests for shopping_items (create new items)
          if (isShoppingItemsRequest && options?.method === 'POST') {
            console.log(`🔄 [PWA] Handling Supabase POST request: ${url}`);
            
            // Parse the request body to get the new item data for optimistic update
            let newItemData: any = null;
            try {
              if (options.body) {
                newItemData = JSON.parse(options.body as string);
                // Handle array format from Supabase
                if (Array.isArray(newItemData)) {
                  newItemData = newItemData[0]; // Take first item
                }
              }
            } catch (error) {
              console.error('❌ [PWA] Failed to parse POST request body:', error);
            }
            
            // Create item optimistically in Dexie (for immediate UI updates)
            if (newItemData) {
              try {
                const optimisticItem: ShoppingItem = {
                  id: newItemData.id,
                  name: newItemData.name,
                  category_id: newItemData.category_id,
                  icon: newItemData.icon,
                  unit_id: newItemData.unit_id,
                  quantity: newItemData.quantity,
                  is_completed: newItemData.is_completed || false,
                  is_deleted: newItemData.is_deleted || false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  list_id: newItemData.list_id,
                  created_by: newItemData.created_by,
                  notes: newItemData.notes,
                  store: newItemData.store,
                  assigned_to: newItemData.assigned_to,
                  completed_at: null,
                  completed_by: null,
                  deleted_at: null,
                  deleted_by: null
                };
                
                await dexieService.addShoppingItem(optimisticItem);
                console.log(`⚡ [PWA] Created item optimistically in Dexie: ${optimisticItem.id}`);
              } catch (error) {
                console.error('❌ [PWA] Error creating item optimistically:', error);
              }
            }
            
            // Check if we're online
            if (navigator.onLine) {
              try {
                const response = await this.executeWithTimeout(originalSupabaseFetch, ...args);
                if (response.ok) {
                  // Parse the response and update Dexie with server data
                  const responseData = await response.clone().json();
                  
                  // Check if response is an array or single object
                  if (Array.isArray(responseData)) {
                    await dexieService.syncShoppingItems(responseData);
                    console.log(`✅ [PWA] Synced Supabase POST response to Dexie: ${responseData.length} items`);
                  } else {
                    // Single item response - update the optimistic item with server data
                    await dexieService.updateShoppingItemFromResponse(responseData);
                    console.log(`✅ [PWA] Updated optimistic item with server data: ${responseData.id}`);
                  }
                  return response;
                }
              } catch (error) {
                if (error instanceof Error && error.message === 'Request timeout') {
                  console.log(`⏰ [PWA] Request timeout (${this.REQUEST_TIMEOUT}ms), queuing POST request: ${url}`);
                } else {
                  console.log(`📴 [PWA] Network failed, queuing POST request: ${url}`);
                }
              }
            } else {
              console.log(`📴 [PWA] Offline, queuing POST request: ${url}`);
            }
            
            // Queue the POST request for later (when offline or network failed)
            const request = new Request(url, {
              ...options,
              headers: new Headers(options?.headers || {})
            });
            await this.queueRequest(request);
            
            // Return optimistic response with the created item
            const optimisticResponse = newItemData ? {
              id: newItemData.id,
              list_id: newItemData.list_id,
              name: newItemData.name,
              quantity: newItemData.quantity,
              unit_id: newItemData.unit_id,
              category_id: newItemData.category_id,
              icon: newItemData.icon,
              notes: newItemData.notes,
              store: newItemData.store,
              assigned_to: newItemData.assigned_to,
              is_completed: newItemData.is_completed || false,
              completed_at: null,
              completed_by: null,
              created_by: newItemData.created_by,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_deleted: newItemData.is_deleted || false,
              deleted_at: null,
              deleted_by: null
            } : { success: true, queued: true };
            
            return new Response(JSON.stringify(optimisticResponse), {
              status: 202,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Handle POST requests for lists (create new lists)
          if (isListsRequest && options?.method === 'POST') {
            console.log(`🔄 [PWA] Handling Supabase POST request for lists: ${url}`);
            
            // Parse the request body to get the new list data for optimistic update
            let newListData: any = null;
            try {
              if (options.body) {
                newListData = JSON.parse(options.body as string);
                // Handle array format from Supabase
                if (Array.isArray(newListData)) {
                  newListData = newListData[0]; // Take first item
                }
              }
            } catch (error) {
              console.error('❌ [PWA] Failed to parse POST request body for lists:', error);
            }
            
            // Create list optimistically in Dexie (for immediate UI updates)
            if (newListData) {
              try {
                const optimisticList: List = {
                  id: newListData.id,
                  name: newListData.name,
                  description: newListData.description,
                  created_by: newListData.created_by,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  is_deleted: 0,
                  deleted_at: null,
                  deleted_by: null
                };
                
                await dexieService.addList(optimisticList);
                console.log(`⚡ [PWA] Created list optimistically in Dexie: ${optimisticList.id}`);

              } catch (error) {
                console.error('❌ [PWA] Error creating list optimistically:', error);
              }
            }
            
            // Check if we're online
            if (navigator.onLine) {
              try {
                const response = await this.executeWithTimeout(originalSupabaseFetch, ...args);
                if (response.ok) {
                  // INFO: We don't need to sync the response to Dexie here, because the list is already in the database
                  // INFO: Also the request does NOT contain JSON data, so we can't parse it
                  // Parse the response and update Dexie with server data
                  // const responseData = await response.clone().json();
                  
                  // // Check if response is an array or single object
                  // if (Array.isArray(responseData)) {
                  //   await dexieService.syncLists(responseData);
                  //   console.log(`✅ [PWA] Synced Supabase POST response to Dexie: ${responseData.length} lists`);
                  // } else {
                  //   // Single list response - update the optimistic list with server data
                  //   await dexieService.updateListFromResponse(responseData);
                  //   console.log(`✅ [PWA] Updated optimistic list with server data: ${responseData.id}`);
                  // }
                  return response;
                }
              } catch (error) {
                if (error instanceof Error && error.message === 'Request timeout') {
                  console.log(`⏰ [PWA] Request timeout (${this.REQUEST_TIMEOUT}ms), queuing POST request for lists: ${url}`);
                } else {
                  console.log(`📴 [PWA] Network failed, queuing POST request for lists: ${url}`);
                }
              }
            } else {
              console.log(`📴 [PWA] Offline, queuing POST request for lists: ${url}`);
            }
            
            // Queue the POST request for later (when offline or network failed)
            const request = new Request(url, {
              ...options,
              headers: new Headers(options?.headers || {})
            });
            await this.queueRequest(request);
            
            // Return optimistic response with the created list
            const optimisticResponse = newListData ? {
              id: newListData.id,
              name: newListData.name,
              description: newListData.description,
              created_by: newListData.created_by,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_deleted: 0,
              deleted_at: null,
              deleted_by: null
            } : { success: true, queued: true };
            
            return new Response(JSON.stringify(optimisticResponse), {
              status: 202,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Handle PATCH requests for shopping_items (update existing items)
          if (isShoppingItemsRequest && options?.method === 'PATCH') {
            console.log(`🔄 [PWA] Handling Supabase PATCH request: ${url}`);
            
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
            
            // Check if we're online
            if (navigator.onLine) {
              try {
                const response = await this.executeWithTimeout(originalSupabaseFetch, ...args);
                if (response.ok) {
                  console.log(`✅ [PWA] Supabase PATCH successful: ${url}`);
                  return response;
                }
              } catch (error) {
                if (error instanceof Error && error.message === 'Request timeout') {
                  console.log(`⏰ [PWA] Request timeout (${this.REQUEST_TIMEOUT}ms), queuing PATCH request: ${url}`);
                } else {
                  console.log(`📴 [PWA] Network failed, queuing PATCH request: ${url}`);
                }
              }
            } else {
              console.log(`📴 [PWA] Offline, queuing PATCH request: ${url}`);
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
          
          // Handle PATCH requests for lists (update existing lists)
          if (isListsRequest && options?.method === 'PATCH') {
            console.log(`🔄 [PWA] Handling Supabase PATCH request for lists: ${url}`);
            
            // Try optimistic update in Dexie
            try {
              const urlObj = new URL(url);
              const listId = this.extractItemIdFromUrl(urlObj);
              if (listId && options.body) {
                const updates = JSON.parse(options.body as string);
                await dexieService.updateList({ 
                  id: listId, 
                  ...updates,
                  updated_at: new Date().toISOString()
                } as List);
                console.log(`⚡ [PWA] Optimistically updated list in Dexie: ${listId}`);
              }
            } catch (error) {
              console.error('❌ [PWA] Error optimistically updating list:', error);
            }
            
            // Check if we're online
            if (navigator.onLine) {
              try {
                const response = await this.executeWithTimeout(originalSupabaseFetch, ...args);
                if (response.ok) {
                  console.log(`✅ [PWA] Supabase PATCH for lists successful: ${url}`);
                  return response;
                }
              } catch (error) {
                if (error instanceof Error && error.message === 'Request timeout') {
                  console.log(`⏰ [PWA] Request timeout (${this.REQUEST_TIMEOUT}ms), queuing PATCH request for lists: ${url}`);
                } else {
                  console.log(`📴 [PWA] Network failed, queuing PATCH request for lists: ${url}`);
                }
              }
            } else {
              console.log(`📴 [PWA] Offline, queuing PATCH request for lists: ${url}`);
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
          try {
            const response = await this.executeWithTimeout(originalSupabaseFetch, ...args);
            if (response.ok && isShoppingItemsRequest && options?.method === 'GET') {
              // Parse and sync response to Dexie
              const responseData = await response.clone().json();
              
              // Check if response is an array or single object
              if (Array.isArray(responseData)) {
                await dexieService.syncShoppingItems(responseData);
                console.log(`✅ [PWA] Synced Supabase response to Dexie: ${responseData.length} items`);
              } else {
                console.log(`⚠️ [PWA] Shopping items response is not an array, skipping Dexie sync: ${url}`);
              }
            }
            return response;
          } catch (error) {
            if (error instanceof Error && error.message === 'Request timeout') {
              console.log(`⏰ [PWA] Request timeout (${this.REQUEST_TIMEOUT}ms) for request: ${url}`);
              // Return a timeout error response
              return new Response(JSON.stringify({ 
                error: 'Request timeout',
                message: `Request timed out after ${this.REQUEST_TIMEOUT}ms`
              }), {
                status: 408,
                headers: { 'Content-Type': 'application/json' }
              });
            }
            throw error; // Re-throw other errors
          }
        };
        
        console.log('✅ [PWA] Supabase client interceptor installed');
        return true;
      }
      return false;
    };

    // Try immediately
    const success = checkSupabase();
    if (!success) {
      // If not available, retry after a delay
      setTimeout(() => {
        const retrySuccess = checkSupabase();
        if (!retrySuccess) {
          console.log('⚠️ [PWA] Supabase client not found after retry, skipping interceptor');
        }
      }, 1000);
    }
  }

  private async updateQueueStatus() {
    // Queue status is now managed by Dexie
    const queueLength = await dexieService.getQueuedRequestsCount();
    this.queueStatus = {
      queueLength,
      isProcessing: this.isProcessingQueue
    };
  }

  public async processQueuedRequests(): Promise<void> {
    await this.processQueuedRequestsInternal();
  }

  public async clearQueuedRequests(): Promise<void> {
    await dexieService.clearQueuedRequests();
    this.queueStatus = { queueLength: 0, isProcessing: false };
    console.log('🗑️ PWA: Queue cleared');
  }

  public async getQueueStatus(): Promise<QueueStatus> {
    const queueLength = await dexieService.getQueuedRequestsCount();
    return { queueLength, isProcessing: this.queueStatus.isProcessing };
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
    // Check if already initialized to prevent multiple setups
    if (globalInterceptorInstalled) {
      console.log('🔍 [PWA] Fetch interceptors already initialized, skipping');
      return;
    }
    
    console.log('🔍 [PWA] Ensuring fetch interceptor is active');
    //this.setupFetchInterceptor();
    this.setupSupabaseInterceptor();
    
    // Mark as initialized globally
    globalInterceptorInstalled = true;
  }
}

// Global flag to prevent multiple interceptor installations
let globalInterceptorInstalled = false;

// Export singleton instance
export const pwaService = new PWAService(); 