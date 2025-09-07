import { dexieService, type ShoppingItem, type List, type Category, type Unit } from './dexieService';
import { globalQueueService } from './globalQueueService';
import { sentryErrorService } from './sentryErrorService';

class GlobalInterceptorService {
  private readonly REQUEST_TIMEOUT = 1500; // 1.5 seconds
  private static instance: GlobalInterceptorService | null = null;
  private static isInitialized = false;
  private isInterceptorActive = false;

  constructor() {
    if (GlobalInterceptorService.instance) {
      return GlobalInterceptorService.instance;
    }
    
    if (GlobalInterceptorService.isInitialized) {
      return GlobalInterceptorService.instance!;
    }
    
    GlobalInterceptorService.instance = this;
    GlobalInterceptorService.isInitialized = true;
    this.initialize();
  }

  private initialize() {
    console.log('🔧 [GlobalInterceptor] Initializing global interceptor service...');
    
    // Set up event listeners for app lifecycle
    this.setupAppLifecycleListeners();
    
    // Initialize interceptors
    this.ensureInterceptors();
    
    console.log('✅ [GlobalInterceptor] Global interceptor service initialized');
  }

  private setupAppLifecycleListeners() {
    // Listen for visibility changes (tab switching, app backgrounding)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('👁️ [GlobalInterceptor] App became visible, ensuring interceptors are active');
        this.ensureInterceptors();
      }
    });

    // Listen for focus events (window focus)
    window.addEventListener('focus', () => {
      console.log('🎯 [GlobalInterceptor] Window focused, ensuring interceptors are active');
      this.ensureInterceptors();
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 [GlobalInterceptor] Online, processing queued requests');
      globalQueueService.processQueuedRequests();
    });

    window.addEventListener('offline', () => {
      console.log('📴 [GlobalInterceptor] Offline');
    });

    // Listen for page load events
    window.addEventListener('load', () => {
      console.log('📄 [GlobalInterceptor] Page loaded, ensuring interceptors are active');
      this.ensureInterceptors();
    });

    // Listen for beforeunload to ensure interceptors are ready
    window.addEventListener('beforeunload', () => {
      console.log('🚪 [GlobalInterceptor] Page unloading, interceptors remain active');
    });
  }

  /**
   * Executes a fetch request with a timeout
   */
  private async executeWithTimeout(fetchFn: (...args: any[]) => Promise<Response>, ...args: any[]): Promise<Response> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), this.REQUEST_TIMEOUT);
    });
    
    return Promise.race([fetchFn(...args), timeoutPromise]);
  }

  private setupFetchInterceptor() {
    // Store original fetch if not already stored
    if (!(window as any)._originalFetch) {
      (window as any)._originalFetch = window.fetch;
    }
    
    const originalFetch = (window as any)._originalFetch;
    
    // Only set up interceptor if not already set up
    if ((window as any)._globalFetchInterceptorSet) {
      console.log('🔍 [GlobalInterceptor] Global fetch interceptor already set up');
      return;
    }
    
    (window as any)._globalFetchInterceptorSet = true;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      
      console.log(`🌐 [GlobalInterceptor] Intercepting request: ${request.method} ${request.url}`);

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
          // Do stuff with the items
          return response;
        }
      } catch (error) {
        console.log(`📴 [GlobalInterceptor] Network failed, trying Offline: ${request.method} ${request.url}`);
        sentryErrorService.reportApiError(error, {
          url: request.url,
          method: request.method,
        });
      }
    } else {
      console.log(`📴 [GlobalInterceptor] Offline, trying Offline: ${request.method} ${request.url}`);
    }

    // Try other solution (when offline or network failed)
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
          console.log(`✅ [GlobalInterceptor] Mutation successful: ${request.method} ${request.url}`);
          return response;
        }
      } catch (error) {
        console.log(`📴 [GlobalInterceptor] Network failed, queuing request: ${request.method} ${request.url}`);
        sentryErrorService.reportApiError(error, {
          url: request.url,
          method: request.method,
        });
      }
    } else {
      console.log(`📴 [GlobalInterceptor] Offline, queuing request: ${request.method} ${request.url}`);
    }

    // Queue the request for later (when offline or network failed)
    await globalQueueService.addRequestToQueue(request);
    
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

  private setupSupabaseInterceptor() {
    // Wait for Supabase client to be available
    const checkSupabase = () => {
      const supabaseClient = (window as any).supabase;
      if (supabaseClient?.rest?.fetch) {
        // Check if we've already intercepted this fetch function
        if ((supabaseClient.rest.fetch as any)._globalInterceptorInstalled) {
          console.log('🔍 [GlobalInterceptor] Supabase interceptor already installed, skipping');
          return true; // Already intercepted
        }
        
        const originalSupabaseFetch = supabaseClient.rest.fetch;
        
        // Mark the original function as intercepted BEFORE replacing it
        (originalSupabaseFetch as any)._globalInterceptorInstalled = true;
        
        supabaseClient.rest.fetch = async (...args: any[]) => {
          // Ensure args is properly structured
          if (!Array.isArray(args) || args.length < 1) {
            console.error('❌ [GlobalInterceptor] Invalid args structure:', args);
            return originalSupabaseFetch(...args);
          }
          
          const [url, options] = args;
          
          // Add request ID to prevent duplicate processing
          const requestId = `${options?.method || 'GET'}_${url}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          console.log(`🔍 [GlobalInterceptor] Intercepting Supabase request: ${options?.method || 'GET'} ${url} [ID: ${requestId}]`);
          
          // Process queued requests first if we're online and queue is not empty
          if (navigator.onLine) {
            const queueCount = await globalQueueService.getQueueLength();
            if (queueCount > 0) {
              console.log(`🔄 [GlobalInterceptor] Queue has ${queueCount} items, processing before handling new request`);
              
              // If queue is already being processed, wait for it to complete
              if (globalQueueService.isProcessing()) {
                console.log(`⏳ [GlobalInterceptor] Queue is already being processed, waiting for completion...`);
                while (globalQueueService.isProcessing()) {
                  await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
                }
                console.log(`✅ [GlobalInterceptor] Queue processing completed, continuing with new request`);
              } else {
                // Start processing the queue
                console.log(`🔄 [GlobalInterceptor] Starting queue processing for ${queueCount} items`);
                await globalQueueService.processQueuedRequests();
              }
            }
          }
          
          const isShoppingItemsRequest = url.includes('/rest/v1/') && url.includes('shopping_items');
          const isListsRequest = url.includes('/rest/v1/') && url.includes('lists');
          const isCategoriesRequest = url.includes('/rest/v1/') && url.includes('grocery_categories');
          const isUnitsRequest = url.includes('/rest/v1/') && url.includes('grocery_units');
          
          // Handle GET requests for shopping_items (load all items)
          if (isShoppingItemsRequest && options?.method === 'GET') {
            return this.handleShoppingItemsGet(url, options, originalSupabaseFetch, args);
          }
          
          // Handle GET requests for lists (load all lists)
          if (isListsRequest && options?.method === 'GET') {
            return this.handleListsGet(url, options, originalSupabaseFetch, args);
          }
          
          // Handle GET requests for categories (load all categories)
          if (isCategoriesRequest && options?.method === 'GET') {
            return this.handleCategoriesGet(url, options, originalSupabaseFetch, args);
          }
          
          // Handle GET requests for units (load all units)
          if (isUnitsRequest && options?.method === 'GET') {
            return this.handleUnitsGet(url, options, originalSupabaseFetch, args);
          }
          
          // Handle POST requests for shopping_items (create new items)
          if (isShoppingItemsRequest && options?.method === 'POST') {
            return this.handleShoppingItemsPost(url, options, originalSupabaseFetch, args);
          }
          
          // Handle POST requests for lists (create new lists)
          if (isListsRequest && options?.method === 'POST') {
            return this.handleListsPost(url, options, originalSupabaseFetch, args);
          }
          
          // Handle PATCH requests for shopping_items (update existing items)
          if (isShoppingItemsRequest && options?.method === 'PATCH') {
            return this.handleShoppingItemsPatch(url, options, originalSupabaseFetch, args);
          }
          
          // Handle PATCH requests for lists (update existing lists)
          if (isListsRequest && options?.method === 'PATCH') {
            return this.handleListsPatch(url, options, originalSupabaseFetch, args);
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
                console.log(`✅ [GlobalInterceptor] Synced Supabase response to Dexie: ${responseData.length} items`);
              } else {
                console.log(`⚠️ [GlobalInterceptor] Shopping items response is not an array, skipping Dexie sync: ${url}`);
              }
            }
            return response;
          } catch (error) {
            if (error instanceof Error && error.message === 'Request timeout') {
              console.log(`⏰ [GlobalInterceptor] Request timeout (${this.REQUEST_TIMEOUT}ms) for request: ${url}`);
              
              // Report timeout to Sentry
              sentryErrorService.reportTimeoutError({
                url: url,
                method: options?.method || 'GET',
                timeout: this.REQUEST_TIMEOUT,
              });
              
              // Return a timeout error response
              return new Response(JSON.stringify({ 
                error: 'Request timeout',
                message: `Request timed out after ${this.REQUEST_TIMEOUT}ms`
              }), {
                status: 408,
                headers: { 'Content-Type': 'application/json' }
              });
            }
            
            // Report other errors to Sentry
            sentryErrorService.reportApiError(error, {
              url: url,
              method: options?.method || 'GET',
              requestBody: options?.body,
            });
            
            throw error; // Re-throw other errors
          }
        };
        
        console.log('✅ [GlobalInterceptor] Supabase client interceptor installed');
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
          console.log('⚠️ [GlobalInterceptor] Supabase client not found after retry, skipping interceptor');
        }
      }, 1000);
    }
  }

  // Handler methods for different request types
  private async handleShoppingItemsGet(url: string, options: any, originalSupabaseFetch: any, args: any[]): Promise<Response> {
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
            console.log(`✅ [GlobalInterceptor] Synced Supabase response to Dexie: ${responseData.length} items`);
          } else {
            console.log(`⚠️ [GlobalInterceptor] Shopping items response is not an array, skipping Dexie sync: ${url}`);
          }
          return response;
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Request timeout') {
          console.log(`⏰ [GlobalInterceptor] Request timeout (${this.REQUEST_TIMEOUT}ms), trying Dexie: ${url}`);
          sentryErrorService.reportTimeoutError({
            url: url,
            method: 'GET',
            timeout: this.REQUEST_TIMEOUT,
          });
        } else {
          console.log(`📴 [GlobalInterceptor] Network failed, trying Dexie: ${url}`);
          sentryErrorService.reportApiError(error, {
            url: url,
            method: 'GET',
          });
        }
      }
    } else {
      console.log(`📴 [GlobalInterceptor] Offline, trying Dexie: ${url}`);
    }
    
    // Try Dexie (when offline or network failed)
    try {
      const urlObj = new URL(url);
      const listId = this.extractListIdFromUrl(urlObj);
      if (listId) {
        const items = await dexieService.getShoppingItemsByListId(listId);
        console.log(`⚡ [GlobalInterceptor] Serving Supabase request from Dexie: ${items.length} items for list ${listId}`);
        return new Response(JSON.stringify(items), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      console.error('❌ [GlobalInterceptor] Error getting items from Dexie:', error);
      sentryErrorService.reportApiError(error, {
        url: url,
        method: 'GET',
        status: 500,
      });
    }

    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleListsGet(url: string, options: any, originalSupabaseFetch: any, args: any[]): Promise<Response> {
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
            console.log(`✅ [GlobalInterceptor] Synced Supabase lists response to Dexie: ${responseData.length} lists`);
          } else {
            console.log(`⚠️ [GlobalInterceptor] Lists response is not an array, skipping Dexie sync: ${url}`);
          }
          return response;
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Request timeout') {
          console.log(`⏰ [GlobalInterceptor] Request timeout (${this.REQUEST_TIMEOUT}ms), trying Dexie for lists: ${url}`);
          sentryErrorService.reportTimeoutError({
            url: url,
            method: 'GET',
            timeout: this.REQUEST_TIMEOUT,
          });
        } else {
          console.log(`📴 [GlobalInterceptor] Network failed, trying Dexie for lists: ${url}`);
          sentryErrorService.reportApiError(error, {
            url: url,
            method: 'GET',
          });
        }
      }
    } else {
      console.log(`📴 [GlobalInterceptor] Offline, trying Dexie for lists: ${url}`);
    }
    
    // Try Dexie (when offline or network failed)
    try {
      // Debug: Check what's in the database
      await dexieService.debugAllLists();
      
      const lists = await dexieService.getAllLists();
      console.log(`⚡ [GlobalInterceptor] Serving Supabase lists request from Dexie: ${lists.length} lists`);
      return new Response(JSON.stringify(lists), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('❌ [GlobalInterceptor] Error getting lists from Dexie:', error);
      sentryErrorService.reportApiError(error, {
        url: url,
        method: 'GET',
        status: 500,
      });
    }

    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleCategoriesGet(url: string, options: any, originalSupabaseFetch: any, args: any[]): Promise<Response> {
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
            console.log(`✅ [GlobalInterceptor] Synced Supabase categories response to Dexie: ${responseData.length} categories`);
          } else {
            console.log(`⚠️ [GlobalInterceptor] Categories response is not an array, skipping Dexie sync: ${url}`);
          }
          return response;
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Request timeout') {
          console.log(`⏰ [GlobalInterceptor] Request timeout (${this.REQUEST_TIMEOUT}ms), trying Dexie for categories: ${url}`);
          sentryErrorService.reportTimeoutError({
            url: url,
            method: 'GET',
            timeout: this.REQUEST_TIMEOUT,
          });
        } else {
          console.log(`📴 [GlobalInterceptor] Network failed, trying Dexie for categories: ${url}`);
          sentryErrorService.reportApiError(error, {
            url: url,
            method: 'GET',
          });
        }
      }
    } else {
      console.log(`📴 [GlobalInterceptor] Offline, trying Dexie for categories: ${url}`);
    }
    
    // Try Dexie (when offline or network failed)
    try {
      const categories = await dexieService.getAllCategories();
      console.log(`⚡ [GlobalInterceptor] Serving Supabase categories request from Dexie: ${categories.length} categories`);
      return new Response(JSON.stringify(categories), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('❌ [GlobalInterceptor] Error getting categories from Dexie:', error);
      sentryErrorService.reportApiError(error, {
        url: url,
        method: 'GET',
        status: 500,
      });
    }

    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleUnitsGet(url: string, options: any, originalSupabaseFetch: any, args: any[]): Promise<Response> {
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
            console.log(`✅ [GlobalInterceptor] Synced Supabase units response to Dexie: ${responseData.length} units`);
          } else {
            console.log(`⚠️ [GlobalInterceptor] Units response is not an array, skipping Dexie sync: ${url}`);
          }
          return response;
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Request timeout') {
          console.log(`⏰ [GlobalInterceptor] Request timeout (${this.REQUEST_TIMEOUT}ms), trying Dexie for units: ${url}`);
          sentryErrorService.reportTimeoutError({
            url: url,
            method: 'GET',
            timeout: this.REQUEST_TIMEOUT,
          });
        } else {
          console.log(`📴 [GlobalInterceptor] Network failed, trying Dexie for units: ${url}`);
          sentryErrorService.reportApiError(error, {
            url: url,
            method: 'GET',
          });
        }
      }
    } else {
      console.log(`📴 [GlobalInterceptor] Offline, trying Dexie for units: ${url}`);
    }
    
    // Try Dexie (when offline or network failed)
    try {
      const units = await dexieService.getAllUnits();
      console.log(`⚡ [GlobalInterceptor] Serving Supabase units request from Dexie: ${units.length} units`);
      return new Response(JSON.stringify(units), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('❌ [GlobalInterceptor] Error getting units from Dexie:', error);
      sentryErrorService.reportApiError(error, {
        url: url,
        method: 'GET',
        status: 500,
      });
    }

    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleShoppingItemsPost(url: string, options: any, originalSupabaseFetch: any, args: any[]): Promise<Response> {
    console.log(`🔄 [GlobalInterceptor] Handling Supabase POST request: ${url}`);
    
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
      console.error('❌ [GlobalInterceptor] Failed to parse POST request body:', error);
      sentryErrorService.reportApiError(error, {
        url: url,
        method: 'POST',
        requestBody: options.body,
      });
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
        console.log(`⚡ [GlobalInterceptor] Created item optimistically in Dexie: ${optimisticItem.id}`);
      } catch (error) {
        console.error('❌ [GlobalInterceptor] Error creating item optimistically:', error);
        sentryErrorService.reportApiError(error, {
          url: url,
          method: 'POST',
          requestBody: newItemData,
        });
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
            console.log(`✅ [GlobalInterceptor] Synced Supabase POST response to Dexie: ${responseData.length} items`);
          } else {
            // Single item response - update the optimistic item with server data
            await dexieService.updateShoppingItemFromResponse(responseData);
            console.log(`✅ [GlobalInterceptor] Updated optimistic item with server data: ${responseData.id}`);
          }
          return response;
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Request timeout') {
          console.log(`⏰ [GlobalInterceptor] Request timeout (${this.REQUEST_TIMEOUT}ms), queuing POST request: ${url}`);
          sentryErrorService.reportTimeoutError({
            url: url,
            method: 'POST',
            timeout: this.REQUEST_TIMEOUT,
          });
        } else {
          console.log(`📴 [GlobalInterceptor] Network failed, queuing POST request: ${url}`);
          sentryErrorService.reportApiError(error, {
            url: url,
            method: 'POST',
          });
        }
      }
    } else {
      console.log(`📴 [GlobalInterceptor] Offline, queuing POST request: ${url}`);
    }
    
    // Queue the POST request for later (when offline or network failed)
    const request = new Request(url, {
      ...options,
      headers: new Headers(options?.headers || {})
    });
    await globalQueueService.addRequestToQueue(request);
    
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

  private async handleListsPost(url: string, options: any, originalSupabaseFetch: any, args: any[]): Promise<Response> {
    console.log(`🔄 [GlobalInterceptor] Handling Supabase POST request for lists: ${url}`);
    
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
      console.error('❌ [GlobalInterceptor] Failed to parse POST request body for lists:', error);
      sentryErrorService.reportApiError(error, {
        url: url,
        method: 'POST',
        requestBody: options.body,
      });
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
        console.log(`⚡ [GlobalInterceptor] Created list optimistically in Dexie: ${optimisticList.id}`);

      } catch (error) {
        console.error('❌ [GlobalInterceptor] Error creating list optimistically:', error);
        sentryErrorService.reportApiError(error, {
          url: url,
          method: 'POST',
          requestBody: newListData,
        });
      }
    }
    
    // Check if we're online
    if (navigator.onLine) {
      try {
        const response = await this.executeWithTimeout(originalSupabaseFetch, ...args);
        if (response.ok) {
          return response;
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Request timeout') {
          console.log(`⏰ [GlobalInterceptor] Request timeout (${this.REQUEST_TIMEOUT}ms), queuing POST request for lists: ${url}`);
          sentryErrorService.reportTimeoutError({
            url: url,
            method: 'POST',
            timeout: this.REQUEST_TIMEOUT,
          });
        } else {
          console.log(`📴 [GlobalInterceptor] Network failed, queuing POST request for lists: ${url}`);
          sentryErrorService.reportApiError(error, {
            url: url,
            method: 'POST',
          });
        }
      }
    } else {
      console.log(`📴 [GlobalInterceptor] Offline, queuing POST request for lists: ${url}`);
    }
    
    // Queue the POST request for later (when offline or network failed)
    const request = new Request(url, {
      ...options,
      headers: new Headers(options?.headers || {})
    });
    await globalQueueService.addRequestToQueue(request);
    
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

  private async handleShoppingItemsPatch(url: string, options: any, originalSupabaseFetch: any, args: any[]): Promise<Response> {
    console.log(`🔄 [GlobalInterceptor] Handling Supabase PATCH request: ${url}`);
    
    // Try optimistic update in Dexie
    try {
      const urlObj = new URL(url);
      const itemId = this.extractItemIdFromUrl(urlObj);
      if (itemId && options.body) {
        const updates = JSON.parse(options.body as string);
        const updatedItem = await dexieService.updateShoppingItemOptimistically(itemId, updates);
        if (updatedItem) {
          console.log(`⚡ [GlobalInterceptor] Optimistically updated item in Dexie: ${itemId}`);
        }
      }
    } catch (error) {
      console.error('❌ [GlobalInterceptor] Error optimistically updating item:', error);
      sentryErrorService.reportApiError(error, {
        url: url,
        method: 'PATCH',
        requestBody: options.body,
      });
    }
    
    // Check if we're online
    if (navigator.onLine) {
      try {
        const response = await this.executeWithTimeout(originalSupabaseFetch, ...args);
        if (response.ok) {
          console.log(`✅ [GlobalInterceptor] Supabase PATCH successful: ${url}`);
          return response;
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Request timeout') {
          console.log(`⏰ [GlobalInterceptor] Request timeout (${this.REQUEST_TIMEOUT}ms), queuing PATCH request: ${url}`);
          sentryErrorService.reportTimeoutError({
            url: url,
            method: 'PATCH',
            timeout: this.REQUEST_TIMEOUT,
          });
        } else {
          console.log(`📴 [GlobalInterceptor] Network failed, queuing PATCH request: ${url}`);
          sentryErrorService.reportApiError(error, {
            url: url,
            method: 'PATCH',
          });
        }
      }
    } else {
      console.log(`📴 [GlobalInterceptor] Offline, queuing PATCH request: ${url}`);
    }
    
    // Queue the PATCH request for later
    const request = new Request(url, {
      ...options,
      headers: new Headers(options?.headers || {})
    });
    await globalQueueService.addRequestToQueue(request);
    
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

  private async handleListsPatch(url: string, options: any, originalSupabaseFetch: any, args: any[]): Promise<Response> {
    console.log(`🔄 [GlobalInterceptor] Handling Supabase PATCH request for lists: ${url}`);
    
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
        console.log(`⚡ [GlobalInterceptor] Optimistically updated list in Dexie: ${listId}`);
      }
    } catch (error) {
      console.error('❌ [GlobalInterceptor] Error optimistically updating list:', error);
      sentryErrorService.reportApiError(error, {
        url: url,
        method: 'PATCH',
        requestBody: options.body,
      });
    }
    
    // Check if we're online
    if (navigator.onLine) {
      try {
        const response = await this.executeWithTimeout(originalSupabaseFetch, ...args);
        if (response.ok) {
          console.log(`✅ [GlobalInterceptor] Supabase PATCH for lists successful: ${url}`);
          return response;
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Request timeout') {
          console.log(`⏰ [GlobalInterceptor] Request timeout (${this.REQUEST_TIMEOUT}ms), queuing PATCH request for lists: ${url}`);
          sentryErrorService.reportTimeoutError({
            url: url,
            method: 'PATCH',
            timeout: this.REQUEST_TIMEOUT,
          });
        } else {
          console.log(`📴 [GlobalInterceptor] Network failed, queuing PATCH request for lists: ${url}`);
          sentryErrorService.reportApiError(error, {
            url: url,
            method: 'PATCH',
          });
        }
      }
    } else {
      console.log(`📴 [GlobalInterceptor] Offline, queuing PATCH request for lists: ${url}`);
    }
    
    // Queue the PATCH request for later
    const request = new Request(url, {
      ...options,
      headers: new Headers(options?.headers || {})
    });
    await globalQueueService.addRequestToQueue(request);
    
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

  // Public methods
  public ensureInterceptors(): void {
    // Check if already initialized to prevent multiple setups
    if (this.isInterceptorActive) {
      console.log('🔍 [GlobalInterceptor] Interceptors already active, skipping');
      return;
    }
    
    console.log('🔍 [GlobalInterceptor] Ensuring interceptors are active');
    this.setupFetchInterceptor();
    this.setupSupabaseInterceptor();
    
    // Mark as active
    this.isInterceptorActive = true;
  }

  public isActive(): boolean {
    return this.isInterceptorActive;
  }

  public getStatus(): { isActive: boolean; hasOriginalFetch: boolean; hasSupabaseInterceptor: boolean } {
    return {
      isActive: this.isInterceptorActive,
      hasOriginalFetch: !!(window as any)._originalFetch,
      hasSupabaseInterceptor: !!(window as any).supabase?.rest?.fetch?._globalInterceptorInstalled
    };
  }
}

// Export singleton instance
export const globalInterceptorService = new GlobalInterceptorService();
