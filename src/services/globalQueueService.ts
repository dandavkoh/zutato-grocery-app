import { dexieService, type QueuedRequest } from './dexieService';
import { sentryErrorService } from './sentryErrorService';

export interface QueueStatus {
  queueLength: number;
  isProcessing: boolean;
}

class GlobalQueueService {
  private queueStatus: QueueStatus = { queueLength: 0, isProcessing: false };
  private isProcessingQueue = false;
  private readonly MAX_QUEUE_SIZE = 5000;
  private static instance: GlobalQueueService | null = null;
  private static isInitialized = false;

  constructor() {
    if (GlobalQueueService.instance) {
      return GlobalQueueService.instance;
    }
    
    if (GlobalQueueService.isInitialized) {
      return GlobalQueueService.instance!;
    }
    
    GlobalQueueService.instance = this;
    GlobalQueueService.isInitialized = true;
    this.initialize();
  }

  private initialize() {
    console.log('🔧 [GlobalQueue] Initializing global queue service...');
    
    // Set up event listeners for app lifecycle
    this.setupAppLifecycleListeners();
    
    // Load queue from Dexie
    this.loadQueueFromDexie();
    
    console.log('✅ [GlobalQueue] Global queue service initialized');
  }

  private setupAppLifecycleListeners() {
    // Listen for visibility changes (tab switching, app backgrounding)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('👁️ [GlobalQueue] App became visible, checking queue status');
        this.loadQueueFromDexie();
        if (navigator.onLine && this.queueStatus.queueLength > 0) {
          console.log('🔄 [GlobalQueue] App visible and online, processing queued requests');
          this.processQueuedRequestsInternal();
        }
      }
    });

    // Listen for focus events (window focus)
    window.addEventListener('focus', () => {
      console.log('🎯 [GlobalQueue] Window focused, checking queue status');
      this.loadQueueFromDexie();
      if (navigator.onLine && this.queueStatus.queueLength > 0) {
        console.log('🔄 [GlobalQueue] Window focused and online, processing queued requests');
        this.processQueuedRequestsInternal();
      }
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 [GlobalQueue] Online, processing queued requests');
      this.processQueuedRequestsInternal();
    });

    window.addEventListener('offline', () => {
      console.log('📴 [GlobalQueue] Offline');
    });

    // Listen for page load events
    window.addEventListener('load', () => {
      console.log('📄 [GlobalQueue] Page loaded, checking queue status');
      this.loadQueueFromDexie();
      if (navigator.onLine && this.queueStatus.queueLength > 0) {
        console.log('🔄 [GlobalQueue] Page loaded and online, processing queued requests');
        this.processQueuedRequestsInternal();
      }
    });

    // Listen for beforeunload to ensure queue is persisted
    window.addEventListener('beforeunload', () => {
      console.log('🚪 [GlobalQueue] Page unloading, queue remains persistent');
    });

    // Periodic queue processing (every 30 seconds when online)
    setInterval(() => {
      if (navigator.onLine && this.queueStatus.queueLength > 0 && !this.isProcessingQueue) {
        console.log('⏰ [GlobalQueue] Periodic queue check, processing queued requests');
        this.processQueuedRequestsInternal();
      }
    }, 30000);
  }

  private async queueRequest(request: Request): Promise<void> {
    // Check queue size limit
    const currentCount = await dexieService.getQueuedRequestsCount();
    if (currentCount >= this.MAX_QUEUE_SIZE) {
      console.warn('⚠️ [GlobalQueue] Queue limit reached, dropping oldest request');
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
    
    console.log(`📝 [GlobalQueue] Request queued: ${request.method} ${request.url} with body: ${queuedRequest.body}`);
    
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
    console.log(`🔄 [GlobalQueue] Processing ${queueCount} queued requests...`);

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

        console.log(`🔄 [GlobalQueue] Replaying request: ${item.method} ${item.url} with body: ${item.body}`);

        // Use original fetch to bypass interceptor
        const response = await window.fetch(request);
        
        if (response.ok) {
          // Handle successful PATCH requests by syncing to Dexie
          if (item.method === 'PATCH' && item.url.includes('shopping_items')) {
            try {
              const updatedItem = await response.clone().json();
              await dexieService.updateShoppingItemFromResponse(updatedItem);
              console.log(`✅ [GlobalQueue] Synced PATCH response to Dexie: ${item.url}`);
            } catch (syncError) {
              console.error('❌ [GlobalQueue] Failed to sync PATCH response to Dexie:', syncError);
            }
          }
          
          await dexieService.removeQueuedRequest(item.id);
          successCount++;
          console.log(`✅ [GlobalQueue] Queued request successful: ${item.method} ${item.url}`);
        } else {
          // Check for specific error codes that should remove the item from queue
          if (response.status === 409) {
            try {
              const errorData = await response.clone().json();
              if (errorData.code === '23505') {
                // Duplicate key constraint violation - remove from queue as item already exists
                await dexieService.removeQueuedRequest(item.id);
                successCount++;
                console.log(`✅ [GlobalQueue] Removed duplicate item from queue (23505): ${item.method} ${item.url}`);
                return; // Skip error counting
              }
            } catch (parseError) {
              console.error('❌ [GlobalQueue] Failed to parse error response:', parseError);
            }
          }
          
          errorCount++;
          console.warn(`⚠️ [GlobalQueue] Queued request failed: ${item.method} ${item.url} (Status: ${response.status})`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ [GlobalQueue] Queued request error: ${item.method} ${item.url}`, error);
        
        // Report queue error to Sentry
        sentryErrorService.reportQueueError(error, {
          queueLength: this.queueStatus.queueLength,
          requestUrl: item.url,
          requestMethod: item.method,
          retryCount: 0, // This is a queued request, not a retry
        });
      }
    }

    this.queueStatus.queueLength = await dexieService.getQueuedRequestsCount();
    this.queueStatus.isProcessing = false;
    this.isProcessingQueue = false;
    
    console.log(`✅ [GlobalQueue] Queue processing completed: ${successCount} successful, ${errorCount} failed`);
  }

  private async getSupabaseHeaders(): Promise<Record<string, string> | null> {
    try {
      const supabaseClient = (window as any).supabase;
      if (!supabaseClient) {
        console.warn('⚠️ [GlobalQueue] Supabase client not available');
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
      
      console.log(`🔑 [GlobalQueue] Retrieved Supabase headers: ${Object.keys(headers).join(', ')}`);
      return headers;
    } catch (error) {
      console.error('❌ [GlobalQueue] Failed to get Supabase headers:', error);
      sentryErrorService.reportApiError(error, {
        url: 'supabase-headers',
        method: 'GET',
      });
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
      console.error('❌ [GlobalQueue] Failed to clone body:', error);
      sentryErrorService.reportApiError(error, {
        url: 'body-clone',
        method: 'POST',
      });
      return null;
    }
  }

  private async loadQueueFromDexie(): Promise<void> {
    try {
      const queueCount = await dexieService.getQueuedRequestsCount();
      this.queueStatus.queueLength = queueCount;
      console.log(`📊 [GlobalQueue] Loaded ${queueCount} queued requests from Dexie`);
    } catch (error) {
      console.error('❌ [GlobalQueue] Failed to load queue from Dexie:', error);
      sentryErrorService.reportApiError(error, {
        url: 'queue-load',
        method: 'GET',
      });
      this.queueStatus.queueLength = 0;
    }
  }

  // Public methods
  public async processQueuedRequests(): Promise<void> {
    await this.processQueuedRequestsInternal();
  }

  public async clearQueuedRequests(): Promise<void> {
    await dexieService.clearQueuedRequests();
    this.queueStatus = { queueLength: 0, isProcessing: false };
    console.log('🗑️ [GlobalQueue] Queue cleared');
  }

  public async getQueueStatus(): Promise<QueueStatus> {
    const queueLength = await dexieService.getQueuedRequestsCount();
    return { queueLength, isProcessing: this.queueStatus.isProcessing };
  }

  public async addRequestToQueue(request: Request): Promise<void> {
    await this.queueRequest(request);
  }

  public isProcessing(): boolean {
    return this.isProcessingQueue;
  }

  public async getQueueLength(): Promise<number> {
    return await dexieService.getQueuedRequestsCount();
  }

  public getStatus(): { queueLength: number; isProcessing: boolean; isOnline: boolean } {
    return {
      queueLength: this.queueStatus.queueLength,
      isProcessing: this.isProcessingQueue,
      isOnline: navigator.onLine
    };
  }

  public async forceProcessQueue(): Promise<void> {
    console.log('🔄 [GlobalQueue] Force processing queue...');
    await this.processQueuedRequestsInternal();
  }

  public async getQueueDetails(): Promise<{ total: number; byMethod: Record<string, number> }> {
    try {
      const allRequests = await dexieService.getAllQueuedRequests();
      const byMethod: Record<string, number> = {};
      
      allRequests.forEach(request => {
        byMethod[request.method] = (byMethod[request.method] || 0) + 1;
      });
      
      return {
        total: allRequests.length,
        byMethod
      };
    } catch (error) {
      console.error('❌ [GlobalQueue] Failed to get queue details:', error);
      return { total: 0, byMethod: {} };
    }
  }
}

// Export singleton instance
export const globalQueueService = new GlobalQueueService();
