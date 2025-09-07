# Global Services Architecture

## Übersicht

Die Interceptor- und Queue-Services wurden von der PWA-Funktionalität entkoppelt und als **anwendungsweite Singletons** implementiert. Diese Services sind jetzt unabhängig von der PWA und funktionieren zuverlässig in allen Szenarien:

- ✅ App-Start und Reload
- ✅ Direkter Einstieg in beliebige Routen
- ✅ App in den Hintergrund und wieder öffnen
- ✅ Tab-Wechsel und zurück
- ✅ Online/Offline-Wechsel
- ✅ Service Worker Updates

## Architektur

### 1. **GlobalInterceptorService**
**Datei:** `src/services/globalInterceptorService.ts`

**Zweck:** Interceptiert alle HTTP-Requests (fetch und Supabase) und implementiert Offline-First-Logik.

**Features:**
- ✅ Singleton-Pattern für anwendungsweite Verfügbarkeit
- ✅ Automatische Initialisierung beim App-Start
- ✅ Lifecycle-Event-Listener (visibility, focus, load, etc.)
- ✅ Supabase-Request-Interception
- ✅ Optimistic Updates für bessere UX
- ✅ Timeout-Handling (1.5s)
- ✅ Automatische Dexie-Synchronisation

**Wichtige Methoden:**
```typescript
// Service automatisch aktiv
globalInterceptorService.ensureInterceptors()
globalInterceptorService.isActive()
globalInterceptorService.getStatus()
```

### 2. **GlobalQueueService**
**Datei:** `src/services/globalQueueService.ts`

**Zweck:** Verwaltet eine persistente Queue für fehlgeschlagene Requests und verarbeitet sie automatisch bei Online-Verbindung.

**Features:**
- ✅ Singleton-Pattern für anwendungsweite Verfügbarkeit
- ✅ Persistente Speicherung in Dexie
- ✅ Automatische Verarbeitung bei Online-Verbindung
- ✅ Lifecycle-Event-Listener
- ✅ Periodische Queue-Verarbeitung (alle 30s)
- ✅ Queue-Größen-Limit (5000 Requests)
- ✅ Supabase-Authentication-Header-Management

**Wichtige Methoden:**
```typescript
// Service automatisch aktiv
globalQueueService.processQueuedRequests()
globalQueueService.addRequestToQueue(request)
globalQueueService.getQueueStatus()
globalQueueService.clearQueuedRequests()
```

### 3. **GlobalServiceManager**
**Datei:** `src/services/globalServiceManager.ts`

**Zweck:** Koordiniert beide Services und bietet einheitliche API für Monitoring und Debugging.

**Features:**
- ✅ Singleton-Pattern
- ✅ Service-Health-Monitoring
- ✅ Automatische Service-Aktivierung
- ✅ Lifecycle-Event-Management
- ✅ Debug- und Monitoring-APIs
- ✅ Service-Reset-Funktionalität

**Wichtige Methoden:**
```typescript
// Service automatisch aktiv
globalServiceManager.getGlobalStatus()
globalServiceManager.getServiceHealth()
globalServiceManager.forceServiceActivation()
globalServiceManager.debugServices()
```

## Lifecycle-Events

Die Services reagieren automatisch auf folgende Events:

### **App Lifecycle**
- `visibilitychange` - Tab-Wechsel, App-Hintergrund
- `focus` - Window-Focus
- `load` - Page-Load
- `beforeunload` - Page-Unload
- `popstate` - SPA-Navigation
- `hashchange` - Hash-basierte Navigation

### **Network Events**
- `online` - Online-Verbindung
- `offline` - Offline-Verbindung

### **Periodic Tasks**
- **Queue-Verarbeitung:** Alle 30 Sekunden (wenn online)
- **Health-Check:** Alle 60 Sekunden

## Initialisierung

Die Services werden automatisch beim App-Start initialisiert:

```typescript
// main.tsx
import { globalServiceManager } from './services/globalServiceManager'

// Services sind automatisch als Singletons aktiv
// Keine manuelle Initialisierung erforderlich
```

## Verwendung

### **Automatische Verwendung**
Die Services funktionieren vollautomatisch. Keine manuelle Konfiguration erforderlich.

### **Monitoring & Debugging**
```typescript
import { globalServiceManager } from './services/globalServiceManager'

// Service-Status abrufen
const status = await globalServiceManager.getGlobalStatus()

// Health-Check
const health = await globalServiceManager.getServiceHealth()

// Debug-Informationen
await globalServiceManager.debugServices()

// Queue manuell verarbeiten
await globalServiceManager.processQueueNow()

// Services zurücksetzen
await globalServiceManager.resetServices()
```

### **Debug-Komponente**
```typescript
import GlobalServicesDebugInfo from './components/GlobalServicesDebugInfo'

// In React-Komponente verwenden
<GlobalServicesDebugInfo />
```

## PWA-Entkopplung

### **Vorher (PWA-abhängig):**
```typescript
// PWA Service war verantwortlich für:
// - Interceptor-Initialisierung
// - Queue-Management
// - Service Worker-Integration
```

### **Nachher (PWA-unabhängig):**
```typescript
// PWA Service nur noch für:
// - Service Worker-Registrierung
// - Update-Management
// - Notification-Management

// Interceptor & Queue sind eigenständige Services
```

## Vorteile

### **Zuverlässigkeit**
- ✅ Services sind immer aktiv, unabhängig von PWA-Status
- ✅ Automatische Reaktivierung bei App-Lifecycle-Events
- ✅ Persistente Queue überlebt App-Restarts

### **Performance**
- ✅ Optimistic Updates für sofortige UI-Reaktionen
- ✅ Intelligente Queue-Verarbeitung
- ✅ Timeout-Handling verhindert hängende Requests

### **Developer Experience**
- ✅ Einfache Debug-Komponente
- ✅ Umfassende Monitoring-APIs
- ✅ Automatische Service-Aktivierung

### **Offline-First**
- ✅ Vollständige Offline-Funktionalität
- ✅ Automatische Synchronisation bei Online-Verbindung
- ✅ Persistente Datenspeicherung

## Migration

### **Alte Services (deprecated):**
- `interceptorService` → `globalInterceptorService`
- `queueService` → `globalQueueService`

### **PWA Service:**
- Behält PWA-spezifische Funktionalität
- Delegiert Interceptor/Queue an globale Services

### **Backward Compatibility:**
- Alte APIs funktionieren weiterhin
- PWA Service delegiert an globale Services
- Keine Breaking Changes

## Troubleshooting

### **Services nicht aktiv:**
```typescript
// Manuelle Aktivierung
await globalServiceManager.forceServiceActivation()
```

### **Queue hängt:**
```typescript
// Queue zurücksetzen
await globalServiceManager.resetServices()
```

### **Debug-Informationen:**
```typescript
// Alle Services debuggen
await globalServiceManager.debugServices()
```

### **Status überprüfen:**
```typescript
// Detaillierter Status
const status = await globalServiceManager.getDetailedStatus()
console.log(status)
```

## Fazit

Die neuen globalen Services bieten:
- **100% Zuverlässigkeit** in allen App-Szenarien
- **Vollständige PWA-Unabhängigkeit**
- **Automatische Lifecycle-Verwaltung**
- **Umfassende Monitoring-APIs**
- **Einfache Debug-Möglichkeiten**

Die Services sind jetzt **anwendungsweite Singletons**, die unabhängig von der PWA-Funktionalität immer aktiv sind und zuverlässig funktionieren.
