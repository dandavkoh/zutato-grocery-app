# Dexie Integration für Offline-Funktionalität

## Übersicht

Die App verwendet jetzt **Dexie** (eine IndexedDB-Wrapper-Bibliothek) anstelle der Cache API für die Offline-Verwaltung der Shopping Items. Dies bietet bessere Performance und mehr Flexibilität bei der Datenverwaltung.

## Architektur

### 1. Dexie Service (`src/services/dexieService.ts`)

**Datenbank-Schema:**
```typescript
interface ShoppingItem {
  id: string;
  list_id: string;
  name: string;
  quantity: number | null;
  unit_id: string | null;
  category_id: string | null;
  icon: string | null;
  notes: string | null;
  store: string | null;
  assigned_to: string | null;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}
```

**Hauptfunktionen:**
- `getShoppingItemsByListId(listId)` - Holt Items für eine spezifische Liste
- `syncShoppingItems(items)` - **Löscht alle Items der list_id und fügt neue hinzu**
- `addShoppingItem(item)` - Fügt ein neues Item hinzu
- `updateShoppingItem(item)` - Aktualisiert ein Item
- `deleteShoppingItem(id, deletedBy)` - Soft-Delete eines Items

### 2. React Hook (`src/hooks/useDexie.ts`)

Bietet eine React-freundliche API für Dexie-Operationen mit:
- Loading States
- Error Handling
- Callback-basierte Funktionen

## Service Worker Integration

### Request Interception

Der Service Worker interceptet GET-Requests für `shopping_items`:

```typescript
// URL-Pattern: GET /rest/v1/shopping_items?select=*&list_id=eq.{listId}&is_deleted=eq.false&order=created_at.desc
```

### Online/Offline Logik

**GET Requests (Online):**
1. Request geht an Supabase
2. **Alle Items der list_id werden aus Dexie gelöscht**
3. **Neue Items von Supabase werden in Dexie eingefügt**
4. Response wird an Client zurückgegeben

**GET Requests (Offline):**
1. Request wird von Dexie beantwortet
2. **Alle Items der list_id werden aus lokaler DB gefiltert**
3. Response im gleichen Format wie Supabase

**PATCH Requests (Online):**
1. Request geht an Supabase
2. Response wird an Client zurückgegeben
3. **Keine lokale Synchronisation nötig**

**PATCH Requests (Offline):**
1. **Optimistisches Update in Dexie** (sofortige UI-Aktualisierung)
2. Request wird in Queue gespeichert
3. Optimistische Response wird zurückgegeben
4. **Request wird verarbeitet sobald Online-Verbindung verfügbar ist**
5. **Erfolgreiche PATCH-Responses werden in Dexie synchronisiert**

### URL-Parameter Parsing

```typescript
private extractListIdFromUrl(url: URL): string | null {
  const listIdParam = url.searchParams.get('list_id');
  if (listIdParam && listIdParam.startsWith('eq.')) {
    return listIdParam.substring(3); // Remove 'eq.' prefix
  }
  return listIdParam;
}
```

## Verwendung

### In React Components

```typescript
import { useDexie } from '../hooks/useDexie';

const MyComponent = () => {
  const { 
    getShoppingItemsByListId, 
    isLoading, 
    error 
  } = useDexie();

  const loadItems = async (listId: string) => {
    const items = await getShoppingItemsByListId(listId);
    // Items verwenden...
  };

  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {/* Component content */}
    </div>
  );
};
```

### Direkte Service-Verwendung

```typescript
import { dexieService } from '../services/dexieService';

// Items für eine Liste laden
const items = await dexieService.getShoppingItemsByListId('list-id');

// Items synchronisieren
await dexieService.syncShoppingItems(itemsFromSupabase);

// Statistiken abrufen
const stats = await dexieService.getStats();
console.log(`Total: ${stats.total}, Active: ${stats.active}, Deleted: ${stats.deleted}`);
```

## Vorteile gegenüber Cache API

1. **Bessere Performance**: IndexedDB ist schneller als Cache API
2. **Flexiblere Abfragen**: Komplexe Filter und Sortierungen möglich
3. **Transaktionale Sicherheit**: ACID-konforme Operationen
4. **Bessere Fehlerbehandlung**: Detaillierte Error-Informationen
5. **React-Integration**: Native Hook-Unterstützung

## Migration von Cache API

- ✅ Cache API vollständig entfernt
- ✅ Dexie-Service implementiert
- ✅ Service Worker angepasst
- ✅ React Hook erstellt
- ✅ Dokumentation erstellt

## Debugging

### Console Logs

Die Integration bietet umfangreiche Logging:

**GET Requests:**
```
🛒 [PWA] Handling shopping items request: GET /rest/v1/shopping_items?...
🗑️ [Dexie] Deleted 3 existing items for list 15b46053-74e6-4582-b1ef-5b49c05fbb7b
✅ [Dexie] Synced 5 shopping items for list 15b46053-74e6-4582-b1ef-5b49c05fbb7b
✅ [PWA] Network response synced to Dexie: /rest/v1/shopping_items?...
⚡ [PWA] Serving from Dexie: 5 items for list 15b46053-74e6-4582-b1ef-5b49c05fbb7b
📊 [Dexie] Retrieved 5 items for list 15b46053-74e6-4582-b1ef-5b49c05fbb7b
```

**PATCH Requests:**
```
🔄 [PWA] Handling Supabase PATCH request: /rest/v1/shopping_items?id=eq.ef93e54d-2cf6-4711-98e7-70f35cc4a2c7&select=*
⚡ [PWA] Optimistically updated item in Dexie: ef93e54d-2cf6-4711-98e7-70f35cc4a2c7
✅ [Dexie] Optimistically updated shopping item: Zucker
📝 [PWA] Request queued: PATCH /rest/v1/shopping_items?id=eq.ef93e54d-2cf6-4711-98e7-70f35cc4a2c7&select=*
🔄 [PWA] Processing 1 queued requests...
✅ [PWA] Queued request successful: PATCH /rest/v1/shopping_items?id=eq.ef93e54d-2cf6-4711-98e7-70f35cc4a2c7&select=*
✅ [PWA] Synced PATCH response to Dexie: /rest/v1/shopping_items?id=eq.ef93e54d-2cf6-4711-98e7-70f35cc4a2c7&select=*
✅ [Dexie] Updated shopping item from response: Zucker
```

### Database Stats

```typescript
const stats = await dexieService.getStats();
// { total: 25, active: 23, deleted: 2 }
```

### Browser DevTools

1. **Application Tab** → **IndexedDB** → **ShoppingItemsDB**
2. **Console** → Dexie-Logs anzeigen
3. **Network Tab** → Intercepted Requests überwachen

## Request Payload Handling

### Body Cloning
Die App unterstützt verschiedene Body-Typen beim Queueing:

- **String**: Direkt gespeichert
- **JSON**: Als String gespeichert
- **FormData**: Zu JSON konvertiert
- **URLSearchParams**: Als String gespeichert
- **ArrayBuffer**: Als Text dekodiert
- **ReadableStream**: Vollständig gelesen und als Text gespeichert

### Headers
- **Content-Type**: Automatisch für PATCH-Requests gesetzt
- **Authorization**: Aktuelle Supabase-Session wird beim Replayen verwendet
- **apikey**: Supabase API Key wird beim Replayen hinzugefügt
- **Accept**: `application/json` für korrekte Response-Formatierung
- **Alle anderen Headers**: Serialisiert und wiederhergestellt

### Debug-Logging
```
📝 [PWA] Request queued: PATCH /rest/v1/shopping_items?id=eq.ef93e54d-2cf6-4711-98e7-70f35cc4a2c7&select=* with body: {"notes":"Brauner","updated_at":"2025-07-29T08:56:03.778Z"}
🔑 [PWA] Retrieved Supabase headers: apikey, Authorization, Content-Type, Accept
🔄 [PWA] Replaying request: PATCH /rest/v1/shopping_items?id=eq.ef93e54d-2cf6-4711-98e7-70f35cc4a2c7&select=* with body: {"notes":"Brauner","updated_at":"2025-07-29T08:56:03.778Z"}
```

## Zukünftige Erweiterungen

- [ ] Batch-Operationen für bessere Performance
- [ ] Automatische Datenbereinigung
- [ ] Konfliktlösung bei Sync-Problemen
- [ ] Offline-First für andere Entitäten (Lists, Categories, etc.) 