import { dexieService, type QueuedRequest } from './dexieService';

export interface QueueStatus {
  queueLength: number;
  isProcessing: boolean;
}

class QueueService {
  private queueStatus: QueueStatus = { queueLength: 0, isProcessing: false };
  private isProcessingQueue = false;
  private readonly MAX_QUEUE_SIZE = 5000;
  private static instance: QueueService | null = null;
  private static isInitialized = false;

  constructor() {
    if (QueueService.instance) {
      return QueueService.instance;
    }
    
    if (QueueService.isInitialized) {
      return QueueService.instance!;
    }
    
    QueueService.instance = this;
    QueueService.isInitialized = true;
    this.loadQueueFromDexie();
  }

  private async queueRequest(request: Request): Promise<void> {
    // Check queue size limit
    const currentCount = await dexieService.getQueuedRequestsCount();
    if (currentCount >= this.MAX_QUEUE_SIZE) {
      console.warn('⚠️ [Queue] Queue limit reached, dropping oldest request');
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
    
    console.log(`📝 [Queue] Request queued: ${request.method} ${request.url} with body: ${queuedRequest.body}`);
    
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
    console.log(`🔄 [Queue] Processing ${queueCount} queued requests...`);

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

        console.log(`🔄 [Queue] Replaying request: ${item.method} ${item.url} with body: ${item.body}`);

        const response = await fetch(request);
        
        if (response.ok) {
          // Handle successful PATCH requests by syncing to Dexie
          if (item.method === 'PATCH' && item.url.includes('shopping_items')) {
            try {
              const updatedItem = await response.clone().json();
              await dexieService.updateShoppingItemFromResponse(updatedItem);
              console.log(`✅ [Queue] Synced PATCH response to Dexie: ${item.url}`);
            } catch (syncError) {
              console.error('❌ [Queue] Failed to sync PATCH response to Dexie:', syncError);
            }
          }
          
          await dexieService.removeQueuedRequest(item.id);
          successCount++;
          console.log(`✅ [Queue] Queued request successful: ${item.method} ${item.url}`);
        } else {
          errorCount++;
          console.warn(`⚠️ [Queue] Queued request failed: ${item.method} ${item.url}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ [Queue] Queued request error: ${item.method} ${item.url}`, error);
      }
    }

    this.queueStatus.queueLength = await dexieService.getQueuedRequestsCount();
    this.queueStatus.isProcessing = false;
    this.isProcessingQueue = false;
    
    console.log(`✅ [Queue] Queue processing completed: ${successCount} successful, ${errorCount} failed`);
  }

  private async getSupabaseHeaders(): Promise<Record<string, string> | null> {
    try {
      const supabaseClient = (window as any).supabase;
      if (!supabaseClient) {
        console.warn('⚠️ [Queue] Supabase client not available');
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
      
      console.log(`🔑 [Queue] Retrieved Supabase headers: ${Object.keys(headers).join(', ')}`);
      return headers;
    } catch (error) {
      console.error('❌ [Queue] Failed to get Supabase headers:', error);
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
      console.error('❌ [Queue] Failed to clone body:', error);
      return null;
    }
  }

  private async loadQueueFromDexie(): Promise<void> {
    try {
      const queueCount = await dexieService.getQueuedRequestsCount();
      this.queueStatus.queueLength = queueCount;
      console.log(`📊 [Queue] Loaded ${queueCount} queued requests from Dexie`);
    } catch (error) {
      console.error('❌ [Queue] Failed to load queue from Dexie:', error);
      this.queueStatus.queueLength = 0;
    }
  }

  public async processQueuedRequests(): Promise<void> {
    await this.processQueuedRequestsInternal();
  }

  public async clearQueuedRequests(): Promise<void> {
    await dexieService.clearQueuedRequests();
    this.queueStatus = { queueLength: 0, isProcessing: false };
    console.log('🗑️ Queue: Queue cleared');
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
}

// Export singleton instance
export const queueService = new QueueService();
