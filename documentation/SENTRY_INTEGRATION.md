# Sentry Error Tracking Integration

## Übersicht

Diese Dokumentation beschreibt die umfassende Sentry-Integration in der ZUTATO PWA für Error Tracking, Performance Monitoring und Session Replay.

## 🏗️ Architektur

### Komponenten

1. **SentryErrorService** (`src/services/sentryErrorService.ts`)
   - Zentraler Service für alle Sentry-Operationen
   - Spezialisierte Methoden für verschiedene Fehlertypen
   - Automatische Context-Setzung und Tagging

2. **SentryUtils** (`src/utils/sentryUtils.ts`)
   - Utility-Funktionen für einfache Sentry-Integration
   - User-Context-Management
   - Vereinfachte API für häufige Operationen

3. **Main.tsx Integration**
   - Sentry-Initialisierung beim App-Start
   - Error Boundary für React-Fehler
   - Environment-basierte Konfiguration

4. **AuthContext Integration**
   - Automatisches User-Context-Setting
   - Sentry-User wird bei Login/Logout aktualisiert

## 🔧 Konfiguration

### Environment Variables

```bash
# .env.local
VITE_SENTRY_DSN=https://c4ed272861a39ed3b6751b3f9c82b6fc@o4509962378346496.ingest.de.sentry.io/4509962381623376
VITE_SENTRY_ENABLED=true
```

### Sentry-Konfiguration

```typescript
Sentry.init({
  dsn: sentryConfig.dsn,
  environment: sentryConfig.environment,
  sendDefaultPii: true,
  tracesSampleRate: sentryConfig.environment === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: sentryConfig.environment === 'production' ? 0.1 : 0.5,
  replaysOnErrorSampleRate: 1.0,
});
```

## 📊 Error Tracking

### Automatisch erfasste Fehler

#### 1. **API-Fehler**
- Supabase-Request-Fehler
- Timeout-Fehler
- Network-Fehler
- HTTP-Status-Fehler

```typescript
// Automatisch in interceptorService.ts
sentryErrorService.reportApiError(error, {
  url: url,
  method: 'GET',
  status: 500,
  requestBody: requestData,
  responseBody: responseData,
  userId: currentUser?.id,
  listId: listId,
});
```

#### 2. **Queue-Fehler**
- Offline-Queue-Verarbeitungsfehler
- Retry-Fehler
- Queue-Overflow-Fehler

```typescript
// Automatisch in queueService.ts
sentryErrorService.reportQueueError(error, {
  queueLength: this.queueStatus.queueLength,
  requestUrl: item.url,
  requestMethod: item.method,
  retryCount: 0,
  userId: currentUser?.id,
});
```

#### 3. **Supabase-Fehler**
- Datenbank-Operationen
- RLS-Policy-Fehler
- Authentifizierungsfehler

```typescript
// Automatisch in supabaseApi.ts
sentryErrorService.reportSupabaseError(error, {
  operation: 'getItems',
  table: 'shopping_items',
  userId: currentUser?.id,
  listId: listId,
});
```

#### 4. **Timeout-Fehler**
- Request-Timeout-Fehler
- Performance-Probleme

```typescript
// Automatisch in interceptorService.ts
sentryErrorService.reportTimeoutError({
  url: url,
  method: 'GET',
  timeout: 1500,
  userId: currentUser?.id,
});
```

### Manuelle Fehler-Reporting

#### Benutzerdefinierte Nachrichten

```typescript
import { reportToSentry } from '../utils/sentryUtils';

// Info-Message
reportToSentry('User completed action', 'info', {
  userId: user.id,
  listId: listId,
});

// Warning
reportToSentry('Unusual user behavior detected', 'warning', {
  userId: user.id,
  action: 'rapid_clicking',
});

// Error
reportToSentry('Critical operation failed', 'error', {
  userId: user.id,
  operation: 'data_sync',
});
```

#### Exception-Reporting

```typescript
import { reportApiError } from '../utils/sentryUtils';

try {
  // API call
} catch (error) {
  reportApiError(error, {
    url: '/api/endpoint',
    method: 'POST',
    status: 500,
    requestBody: requestData,
    userId: user.id,
    listId: listId,
  });
}
```

## 👤 User Context

### Automatisches User-Management

Der User-Context wird automatisch gesetzt:

```typescript
// Bei Login
setSentryUser(authUser);

// Bei Logout
setSentryUser(null);
```

### Manuelles User-Setting

```typescript
import { setSentryUser } from '../utils/sentryUtils';

// User setzen
setSentryUser({
  id: 'user-123',
  email: 'user@example.com',
  username: 'John Doe',
});

// User entfernen
setSentryUser(null);
```

## 🏷️ Tags und Context

### Automatische Tags

- `error_type`: api_error, queue_error, supabase_error, timeout_error
- `http_method`: GET, POST, PATCH, DELETE
- `http_status`: 200, 400, 500, etc.
- `operation`: getItems, createItem, updateItem, etc.
- `table`: shopping_items, lists, etc.

### Automatischer Context

- `api_request`: URL, Method, Status, Request/Response Body
- `queue_request`: Queue-Länge, Retry-Count, Request-Details
- `supabase_operation`: Operation, Table, User-Info
- `shopping_list`: List-ID für Listen-bezogene Fehler
- `user`: User-ID, Email, Username

## 📈 Performance Monitoring

### Automatische Performance-Tracking

- **Page Load Times**: Automatisch erfasst
- **API Response Times**: Über Interceptor erfasst
- **User Interactions**: Automatisch getrackt

### Custom Performance-Tracking

```typescript
import * as Sentry from '@sentry/react';

// Custom Transaction
const transaction = Sentry.startTransaction({
  name: 'Shopping List Load',
  op: 'navigation',
});

// Custom Span
const span = transaction.startChild({
  op: 'db.query',
  description: 'Load shopping items',
});

// Span beenden
span.finish();

// Transaction beenden
transaction.finish();
```

## 🎬 Session Replay

### Automatische Session-Aufzeichnung

- **Error Sessions**: 100% der Sessions mit Fehlern
- **Random Sessions**: 10% in Production, 50% in Development
- **User Privacy**: Automatische PII-Filterung

### Konfiguration

```typescript
replaysSessionSampleRate: 0.1,  // 10% in Production
replaysOnErrorSampleRate: 1.0,  // 100% bei Fehlern
```

## 🚨 Error Boundary

### React Error Boundary

```typescript
<Sentry.ErrorBoundary fallback={({ error, resetError }) => (
  <div>
    <h1>Oops! Etwas ist schiefgelaufen</h1>
    <p>Ein unerwarteter Fehler ist aufgetreten.</p>
    <button onClick={resetError}>Seite neu laden</button>
  </div>
)}>
  <App />
</Sentry.ErrorBoundary>
```

### Features

- **Benutzerfreundliche Fehlerseite**: Deutsche Übersetzung
- **Recovery-Button**: "Seite neu laden" für App-Recovery
- **Development-Details**: Fehlerdetails nur in Development
- **Automatisches Error-Reporting**: Fehler werden an Sentry gesendet

## 🔍 Debugging und Monitoring

### Sentry Dashboard

1. **Issues**: Alle erfassten Fehler mit Details
2. **Performance**: App-Performance-Metriken
3. **Releases**: Version-basierte Fehler-Tracking
4. **Users**: User-spezifische Fehler-Analyse

### Lokale Entwicklung

```typescript
// Sentry-Status prüfen
import { isSentryEnabled } from '../utils/sentryUtils';

if (isSentryEnabled()) {
  console.log('Sentry ist aktiviert');
} else {
  console.log('Sentry ist deaktiviert');
}
```

## 📋 Best Practices

### 1. **Error-Kategorisierung**
- Verwende spezifische `error_type` Tags
- Setze relevante Context-Informationen
- Verwende aussagekräftige Error-Messages

### 2. **User-Privacy**
- Keine sensiblen Daten in Context
- Automatische PII-Filterung aktiviert
- User-Consent für erweiterte Tracking

### 3. **Performance**
- Sentry läuft nur bei aktiviertem Flag
- Sampling-Rates für Production optimiert
- Minimale Impact auf App-Performance

### 4. **Error-Handling**
- Kombiniere Sentry mit lokaler Error-Behandlung
- Verwende Sentry als zusätzliche Information
- Implementiere Fallback-Mechanismen

## 🛠️ Troubleshooting

### Häufige Probleme

#### 1. **Sentry sendet keine Events**
```typescript
// Prüfe Konfiguration
console.log('Sentry enabled:', isSentryEnabled());
console.log('Sentry DSN:', getSentryConfig().dsn);
```

#### 2. **User-Context wird nicht gesetzt**
```typescript
// Prüfe AuthContext-Integration
// User sollte automatisch bei Login gesetzt werden
```

#### 3. **Performance-Impact**
```typescript
// Reduziere Sampling-Rates
tracesSampleRate: 0.05,  // 5% statt 10%
replaysSessionSampleRate: 0.05,  // 5% statt 10%
```

## 📊 Metriken und Alerts

### Wichtige Metriken

1. **Error Rate**: Fehler pro Session
2. **Performance**: Page Load Times, API Response Times
3. **User Impact**: Betroffene User pro Fehler
4. **Queue Health**: Offline-Queue-Verarbeitung

### Alert-Konfiguration

- **Critical Errors**: Sofortige Benachrichtigung
- **High Error Rate**: > 5% Fehlerrate
- **Performance Degradation**: > 2s Page Load Time
- **Queue Overflow**: > 1000 queued requests

## 🎯 Vorteile

1. **Proaktive Fehler-Erkennung**: Fehler werden sofort erkannt
2. **User-Context**: Fehler werden mit User-Informationen verknüpft
3. **Performance-Monitoring**: App-Performance wird kontinuierlich überwacht
4. **Session Replay**: Vollständige Reproduktion von Fehlern
5. **Automatische Integration**: Keine manuelle Sentry-Calls erforderlich
6. **Environment-Aware**: Unterschiedliche Konfiguration für Dev/Prod
7. **Privacy-Compliant**: Automatische PII-Filterung
8. **Comprehensive Coverage**: Alle API-Requests, Queue-Operations und Supabase-Calls abgedeckt
