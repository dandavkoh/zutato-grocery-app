# Supabase Realtime Integration

Diese Dokumentation beschreibt die Integration von Supabase Realtime für die Einkaufslisten-Synchronisation.

## Übersicht

Die Realtime-Integration ermöglicht es, dass Änderungen an Einkaufslisten in Echtzeit zwischen allen Benutzern synchronisiert werden, die die gleiche Liste geöffnet haben.

## Architektur

### Komponenten

1. **RealtimeService** (`src/services/realtimeService.ts`)
   - Verwaltet WebSocket-Verbindungen zu Supabase
   - Handhabt Channel-Subscriptions und Broadcasting
   - Implementiert Reconnection-Logik mit Exponential Backoff
   - Verwaltet Offline-Queue für ausstehende Aktionen

2. **useRealtimeSync Hook** (`src/hooks/useRealtimeSync.ts`)
   - React Hook für die Integration in Komponenten
   - Automatische Subscription/Unsubscription
   - Handhabt Online/Offline-Status-Änderungen

3. **RealtimeStatus Component** (`src/components/RealtimeStatus.tsx`)
   - UI-Indikator für den Verbindungsstatus
   - Zeigt Live-Sync-Status an

### Datenfluss

```
ShoppingListPage
    ↓
useRealtimeSync Hook
    ↓
RealtimeService
    ↓
Supabase Realtime Channel
```

## Funktionalitäten

### 1. Channel-basierte Synchronisation

- Jede Einkaufsliste hat ihren eigenen Channel (`list-{listId}`)
- Nur Benutzer mit der Liste geöffnet erhalten Updates
- Channel wird automatisch beim Öffnen der Liste abonniert

### 2. Automatische Reconnection

- Bei Verbindungsverlust wird automatisch versucht, die Verbindung wiederherzustellen
- Exponential Backoff verhindert zu häufige Reconnection-Versuche
- Maximal 5 Reconnection-Versuche

### 3. Offline-Support

- Aktionen werden in localStorage gecacht, wenn keine Internetverbindung besteht
- Beim Wiederherstellen der Verbindung werden alle ausstehenden Aktionen verarbeitet
- Fehlgeschlagene Aktionen werden automatisch erneut versucht

### 4. Broadcasting

Folgende Aktionen werden automatisch an alle Subscriber gesendet:

- `item_created` - Neues Item erstellt
- `item_updated` - Item bearbeitet
- `item_deleted` - Item gelöscht
- `item_completed` - Item als erledigt markiert

## Verwendung

### In einer Komponente

```typescript
import { useRealtimeSync } from '../hooks/useRealtimeSync';

const ShoppingListPage = () => {
  const { listId } = useParams();
  
  const { isConnected } = useRealtimeSync(listId, () => {
    // Callback wird aufgerufen, wenn Updates empfangen werden
    console.log('Realtime update received');
  });

  return (
    <div>
      {/* Komponenten-Inhalt */}
      <RealtimeStatus isConnected={isConnected} listId={listId} />
    </div>
  );
};
```

### Broadcasting von Updates

Updates werden automatisch gesendet, wenn die entsprechenden API-Methoden aufgerufen werden:

```typescript
// Automatisch broadcasted
await shoppingItemsController.createItem(itemData);
await shoppingItemsController.updateItem(id, updates);
await shoppingItemsController.deleteItem(id, listId);
await shoppingItemsController.setItemCompletion(id, isCompleted);
```

## Konfiguration

### Supabase Client

Der Supabase Client ist bereits mit Realtime-Unterstützung konfiguriert:

```typescript
// src/config/supabase.ts
export const supabase = createClient(url, anonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
```

### Environment Variables

Stelle sicher, dass die Supabase-Konfiguration korrekt gesetzt ist:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Sicherheit

- Nur authentifizierte Benutzer können Channels abonnieren
- Channel-Namen basieren auf der List-ID
- Row Level Security (RLS) in Supabase schützt die Daten

## Monitoring

### Logging

Alle Realtime-Ereignisse werden geloggt:

- Channel-Subscription-Status
- Broadcasting-Ereignisse
- Reconnection-Versuche
- Offline-Queue-Verarbeitung

### Debugging

Für Debugging-Zwecke können die Logs in der Browser-Konsole eingesehen werden:

```javascript
// Aktive Channels anzeigen
console.log(realtimeService.getActiveChannels());

// Verbindungsstatus prüfen
console.log(realtimeService.isConnected());
```

## Fehlerbehandlung

### Häufige Probleme

1. **Verbindungsverlust**
   - Automatische Reconnection wird versucht
   - Aktionen werden in Offline-Queue gespeichert

2. **Channel-Subscription-Fehler**
   - Automatischer Neuversuch nach kurzer Verzögerung
   - Fallback auf Polling, falls Realtime nicht verfügbar

3. **Broadcasting-Fehler**
   - Aktionen werden in Queue gespeichert
   - Automatischer Retry beim nächsten Online-Status

### Manuelle Wiederherstellung

```typescript
// Channel manuell neu abonnieren
realtimeService.unsubscribeFromList(listId);
realtimeService.subscribeToList(listId, onUpdate);

// Offline-Queue manuell verarbeiten
// (wird automatisch beim Online-Status gemacht)
```

## Performance

- Maximal 10 Events pro Sekunde (Supabase-Limit)
- Channel-Subscriptions werden automatisch bereinigt
- Offline-Queue verhindert Datenverlust bei Verbindungsproblemen

## Standby/Resume Support

Die Realtime-Integration unterstützt automatisch Standby/Resume-Szenarien:

### Automatische Erkennung
- **Page Visibility API**: Erkennt, wenn der PC in Standby geht oder wieder aktiv wird
- **Focus Events**: Zusätzliche Erkennung von Standby/Resume über Window-Focus-Events
- **Online/Offline Events**: Standard-Browser-Events für Netzwerk-Status

### Verhalten bei Standby
- **Going to Standby**: Keine spezielle Aktion - Channels bleiben aktiv
- **Resume from Standby**: 
  - Automatische Überprüfung der Internetverbindung
  - Verarbeitung der Offline-Queue
  - Überprüfung und Wiederherstellung der Channel-Verbindungen
  - Benachrichtigung aller Listener

### Beispiel-Logs
```
Page became hidden (going to standby)
Page became visible (resume from standby)
Handling resume from standby
Internet connection restored
Processing offline queue
Global realtime sync: Subscribed to list
```

## Direkte Route-Aufrufe

Die Realtime-Synchronisation funktioniert auch bei direkten Route-Aufrufen:

### Globale Route-Erkennung
- **Automatische List-ID-Extraktion**: Aus der URL wird automatisch die `listId` extrahiert
- **Route-basierte Subscription**: Basierend auf der aktuellen Route wird automatisch der richtige Channel abonniert
- **Globale Komponente**: `RealtimeStatus` wird global angezeigt und funktioniert auf allen Shopping-List-Routen

### Unterstützte Routen
```
/shopping-list/15b46053-74e6-4582-b1ef-5b49c05fbb7b
/shopping-list/15b46053-74e6-4582-b1ef-5b49c05fbb7b/product/e7162cd9-8447-4994-ac59-b4d6979a2315
/shopping-list/15b46053-74e6-4582-b1ef-5b49c05fbb7b/product/e7162cd9-8447-4994-ac59-b4d6979a2315/unit
/shopping-list/15b46053-74e6-4582-b1ef-5b49c05fbb7b/search
```

### Automatisches Channel-Management
```typescript
// Automatisch bei Route-Wechsel
Global realtime sync: Switching to new list
Global realtime sync: Subscribed to list
Global realtime sync: Update received
```

## Zukünftige Erweiterungen

- Presence-Features (wer ist online)
- Typisierte Realtime-Events
- Erweiterte Offline-Synchronisation
- Konfliktlösung bei gleichzeitigen Änderungen 