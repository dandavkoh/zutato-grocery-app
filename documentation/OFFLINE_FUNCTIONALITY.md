# Offline-Funktionalität für HNGRY PWA

## Übersicht

Die HNGRY PWA wurde um umfassende Offline-Funktionalität erweitert, die es Benutzern ermöglicht, die App auch ohne Internetverbindung zu nutzen. Alle CRUD-Operationen für Shopping Items werden unterstützt.

## Implementierte Features

### 1. API-Caching (Network First Strategy)
- **GET Requests**: Werden mit "Network First" Strategie behandelt
- **Cache-Dauer**: 24 Stunden für API-Responses
- **Fallback**: Bei Netzwerkfehlern werden gecachte Daten verwendet

### 2. Request-Queuing für Mutationen
- **POST/PUT/PATCH/DELETE**: Werden bei Offline-Status in eine Queue gespeichert
- **Automatische Synchronisation**: Queue wird verarbeitet sobald Online-Verbindung verfügbar ist
- **Persistente Speicherung**: Queue überlebt Browser-Neustarts

### 3. Offline-Status-Anzeige
- **Visuelle Indikatoren**: Zeigt aktuellen Online/Offline-Status an
- **Queue-Status**: Zeigt Anzahl wartender Requests an
- **Synchronisations-Feedback**: Benachrichtigt über erfolgreiche Synchronisation

## Technische Implementierung

### Service Worker (`public/sw.js`)

Der Service Worker implementiert folgende Strategien:

```javascript
// GET Requests: Network First mit Cache Fallback
if (request.method === 'GET') {
  event.respondWith(handleGetRequest(request));
}
// Mutationen: Network First mit Queue Fallback  
else if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
  event.respondWith(handleMutationRequest(request));
}
```

### Request Queue System

```javascript
class RequestQueue {
  async add(request) {
    // Serialisiert Request und speichert in Cache
  }
  
  async processQueue() {
    // Verarbeitet alle queued Requests wenn online
  }
}
```

### PWA Service Erweiterungen

Der `pwaService` wurde um folgende Funktionen erweitert:

- `processQueuedRequests()`: Manuelles Verarbeiten der Queue
- `clearQueuedRequests()`: Löschen der Queue
- `getQueueStatus()`: Aktueller Queue-Status
- `hasQueuedRequests()`: Prüfung ob Queue nicht leer ist

## Unterstützte API-Endpoints

### GET Endpoints (Network First + Cache)
- `GET /api/shopping-items/:householdId`
- `GET /api/shopping-items/:householdId/category/:category`
- `GET /api/shopping-items/:householdId/completed`
- `GET /api/shopping-items/:householdId/search`

### Mutation Endpoints (Network First + Queue)
- `POST /api/shopping-items` (Create)
- `PUT /api/shopping-items/:id` (Update)
- `PATCH /api/shopping-items/:id/toggle` (Toggle Completion)
- `DELETE /api/shopping-items/:id` (Delete)

## Benutzer-Erfahrung

### Online-Modus
- Alle Requests gehen direkt an den Server
- Erfolgreiche GET-Responses werden gecacht
- Optimale Performance und Echtzeit-Daten

### Offline-Modus
- GET-Requests werden aus Cache bedient
- Mutationen werden in Queue gespeichert
- Benutzer sieht Offline-Indikator
- Optimistic Updates für bessere UX

### Wiederherstellung der Verbindung
- Automatische Verarbeitung der Queue
- Benachrichtigung über erfolgreiche Synchronisation
- Cache-Invalidierung für aktualisierte Daten

## Komponenten

### OfflineIndicator
Zeigt den aktuellen Offline-Status und Queue-Informationen an:

```tsx
<OfflineIndicator />
```

### PWAUpdateBanner
Bestehende Komponente für PWA-Updates (unverändert)

## Konfiguration

### Vite PWA Config
```typescript
{
  urlPattern: /\/api\/shopping-items\/.*/i,
  handler: 'NetworkFirst',
  options: {
    cacheName: 'shopping-items-api-cache',
    networkTimeoutSeconds: 3,
    expiration: {
      maxEntries: 100,
      maxAgeSeconds: 60 * 60 * 24 // 24 Stunden
    }
  }
}
```

## Debugging

### Service Worker Logs
Alle Service Worker Aktivitäten werden in der Konsole geloggt:

```
🌐 [SW] Intercepting API request: GET /api/shopping-items/household-1
📝 [SW] Request queued: POST /api/shopping-items
✅ [SW] Queued request successful: POST /api/shopping-items
```

### PWA Service Logs
```
📊 PWA: Queue status updated - 3 items, processing: false
✅ PWA: 3 queued requests processed
```

## Browser-Kompatibilität

- **Service Worker**: Chrome 40+, Firefox 44+, Safari 11.1+
- **Cache API**: Chrome 40+, Firefox 39+, Safari 10.1+
- **Background Sync**: Chrome 49+ (optional, für bessere UX)

## RTK Query Integration

Die Offline-Funktionalität funktioniert nahtlos mit RTK Query zusammen:

- **Keine Änderungen** an RTK Query Hooks erforderlich
- **Optimistic Updates** funktionieren weiterhin
- **Cache-Invalidierung** wird automatisch gehandhabt
- **Error Handling** bleibt unverändert

## Zukünftige Erweiterungen

1. **Background Sync**: Für automatische Synchronisation im Hintergrund
2. **Conflict Resolution**: Für gleichzeitige Änderungen
3. **Selective Sync**: Für bestimmte Datenkategorien
4. **Offline-First Mode**: Für bewusste Offline-Nutzung 