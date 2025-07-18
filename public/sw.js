// Service Worker für Offline-API-Funktionalität
const CACHE_NAME = 'hngry-offline-v1';
const API_CACHE_NAME = 'shopping-items-api-cache';
const QUEUE_STORAGE_KEY = 'offline-request-queue';

// API Endpoints die wir cachen wollen
const API_ENDPOINTS = {
  GET_ITEMS: /\/api\/shopping-items\/[^\/]+$/,
  GET_ITEMS_BY_CATEGORY: /\/api\/shopping-items\/[^\/]+\/category\/[^\/]+$/,
  GET_COMPLETED_ITEMS: /\/api\/shopping-items\/[^\/]+\/completed$/,
  SEARCH_ITEMS: /\/api\/shopping-items\/[^\/]+\/search$/,
  CREATE_ITEM: /\/api\/shopping-items$/,
  UPDATE_ITEM: /\/api\/shopping-items\/[^\/]+$/,
  TOGGLE_ITEM: /\/api\/shopping-items\/[^\/]+\/toggle$/,
  DELETE_ITEM: /\/api\/shopping-items\/[^\/]+$/
};

// Request Queue für Offline-Requests
class RequestQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  async add(request) {
    const queueItem = {
      id: Date.now() + Math.random(),
      request: {
        url: request.url,
        method: request.method,
        headers: this.serializeHeaders(request.headers),
        body: request.body ? await this.cloneBody(request.body) : null
      },
      timestamp: Date.now()
    };

    this.queue.push(queueItem);
    await this.saveQueue();
    
    console.log(`📝 [SW] Request queued: ${request.method} ${request.url}`);
    
    // Versuche Queue zu verarbeiten wenn online
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  async remove(id) {
    this.queue = this.queue.filter(item => item.id !== id);
    await this.saveQueue();
  }

  async saveQueue() {
    try {
      await caches.open(CACHE_NAME);
      const response = new Response(JSON.stringify(this.queue));
      await caches.open(CACHE_NAME).then(cache => 
        cache.put(QUEUE_STORAGE_KEY, response)
      );
    } catch (error) {
      console.error('❌ [SW] Failed to save queue:', error);
    }
  }

  async loadQueue() {
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(QUEUE_STORAGE_KEY);
      if (response) {
        const data = await response.json();
        this.queue = data || [];
      }
    } catch (error) {
      console.error('❌ [SW] Failed to load queue:', error);
      this.queue = [];
    }
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0 || !navigator.onLine) {
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 [SW] Processing ${this.queue.length} queued requests...`);

    const itemsToProcess = [...this.queue];
    
    for (const item of itemsToProcess) {
      try {
        const request = new Request(item.request.url, {
          method: item.request.method,
          headers: new Headers(item.request.headers),
          body: item.request.body
        });

        const response = await fetch(request);
        
        if (response.ok) {
          await this.remove(item.id);
          console.log(`✅ [SW] Queued request successful: ${item.request.method} ${item.request.url}`);
        } else {
          console.warn(`⚠️ [SW] Queued request failed: ${item.request.method} ${item.request.url}`);
        }
      } catch (error) {
        console.error(`❌ [SW] Queued request error: ${item.request.method} ${item.request.url}`, error);
      }
    }

    this.isProcessing = false;
    
    // Benachrichtige Client über verarbeitete Queue
    this.notifyClients({
      type: 'QUEUE_PROCESSED',
      count: itemsToProcess.length
    });
  }

  serializeHeaders(headers) {
    const serialized = {};
    headers.forEach((value, key) => {
      serialized[key] = value;
    });
    return serialized;
  }

  async cloneBody(body) {
    if (!body) return null;
    const clone = await body.clone();
    return await clone.text();
  }

  notifyClients(data) {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage(data);
      });
    });
  }
}

// Global Queue Instance
const requestQueue = new RequestQueue();

// Service Worker Events
self.addEventListener('install', (event) => {
  console.log('🚀 [SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json'
      ]);
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('✅ [SW] Service worker activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('🗑️ [SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Lade gespeicherte Queue beim Aktivieren
      return requestQueue.loadQueue();
    })
  );
});

// Fetch Event Handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Nur API Requests behandeln
  if (!url.pathname.startsWith('/api/shopping-items')) {
    return;
  }

  console.log(`🌐 [SW] Intercepting API request: ${request.method} ${request.url}`);

  // GET Requests: Network First mit Cache Fallback
  if (request.method === 'GET') {
    event.respondWith(handleGetRequest(request));
  }
  // POST/PUT/PATCH/DELETE: Network First mit Queue Fallback
  else if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    event.respondWith(handleMutationRequest(request));
  }
});

async function handleGetRequest(request) {
  try {
    // Versuche zuerst Network Request
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache die erfolgreiche Response
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      console.log(`✅ [SW] Network response cached: ${request.method} ${request.url}`);
      return networkResponse;
    }
  } catch (error) {
    console.log(`📴 [SW] Network failed, trying cache: ${request.method} ${request.url}`);
  }

  // Fallback: Versuche aus Cache zu laden
  const cache = await caches.open(API_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log(`⚡ [SW] Serving from cache: ${request.method} ${request.url}`);
    return cachedResponse;
  }

  // Kein Cache verfügbar - return error response
  console.log(`❌ [SW] No cache available: ${request.method} ${request.url}`);
  return new Response(JSON.stringify({ 
    error: 'Offline - Keine Daten verfügbar',
    offline: true 
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleMutationRequest(request) {
  try {
    // Versuche zuerst Network Request
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      console.log(`✅ [SW] Mutation successful: ${request.method} ${request.url}`);
      
      // Invalidate related caches
      await invalidateRelatedCaches(request);
      
      return networkResponse;
    }
  } catch (error) {
    console.log(`📴 [SW] Network failed, queuing request: ${request.method} ${request.url}`);
  }

  // Offline: Queue den Request
  await requestQueue.add(request);
  
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

async function invalidateRelatedCaches(request) {
  const cache = await caches.open(API_CACHE_NAME);
  const url = new URL(request.url);
  
  // Lösche alle verwandten Cache-Einträge
  const keys = await cache.keys();
  const relatedKeys = keys.filter(key => {
    const keyUrl = new URL(key.url);
    return keyUrl.pathname.startsWith('/api/shopping-items');
  });
  
  await Promise.all(relatedKeys.map(key => cache.delete(key)));
  console.log(`🗑️ [SW] Invalidated ${relatedKeys.length} cache entries`);
}

// Online/Offline Event Handler
self.addEventListener('online', () => {
  console.log('🌐 [SW] Online - processing queued requests');
  requestQueue.processQueue();
});

self.addEventListener('offline', () => {
  console.log('📴 [SW] Offline - requests will be queued');
});

// Message Handler für Client Communication
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'GET_QUEUE_STATUS':
      event.ports[0].postMessage({
        queueLength: requestQueue.queue.length,
        isProcessing: requestQueue.isProcessing
      });
      break;
      
    case 'PROCESS_QUEUE':
      requestQueue.processQueue();
      break;
      
    case 'CLEAR_QUEUE':
      requestQueue.queue = [];
      requestQueue.saveQueue();
      break;
  }
});

// Background Sync (falls unterstützt)
self.addEventListener('sync', (event) => {
  if (event.tag === 'process-queue') {
    console.log('🔄 [SW] Background sync - processing queue');
    event.waitUntil(requestQueue.processQueue());
  }
}); 