# Environment Configuration Setup

## Übersicht

Die HNGRY PWA verwendet eine umfassende Environment-Konfiguration für Development und Production mit Supabase-Integration. Dies ermöglicht eine saubere Trennung zwischen Entwicklungs- und Produktionsumgebungen.

## 📁 Dateien

### **Environment-Konfiguration**
- `src/config/environment.ts` - Hauptkonfiguration mit TypeScript Interfaces
- `src/config/supabase.ts` - Supabase-Client-Konfiguration
- `env.development` - Development-spezifische Variablen
- `env.production` - Production-spezifische Variablen

### **Vite-Konfiguration**
- `vite.config.ts` - PWA-Manifest-Konfiguration basierend auf Environment

## 🔧 Environment-Variablen

### **Supabase Configuration**
```typescript
supabaseUrl: string;           // Supabase Project URL
supabaseAnonKey: string;       // Public Anon Key
supabaseServiceRoleKey: string; // Service Role Key (Server only)
```

### **API Configuration**
```typescript
apiBaseUrl: string;        // API Base URL
apiTimeout: number;        // Request Timeout in ms
```

### **PWA Configuration**
```typescript
pwaName: string;           // PWA Name
pwaShortName: string;      // PWA Short Name
pwaDescription: string;    // PWA Description
pwaThemeColor: string;     // Theme Color
pwaBackgroundColor: string; // Background Color
```

### **Offline Configuration**
```typescript
maxQueueSize: number;      // Max. Anzahl Requests in Queue
cacheDuration: number;     // Cache-Dauer in ms
cacheCleanupInterval: number; // Cache-Bereinigung Intervall
```

### **Feature Flags**
```typescript
enableOfflineMode: boolean;      // Offline-Funktionalität
enableNotifications: boolean;    // Push-Notifications
enableBackgroundSync: boolean;   // Background Sync
```

### **Debug Configuration**
```typescript
enableDebugLogs: boolean;        // Debug-Logs
enablePerformanceMonitoring: boolean; // Performance Monitoring
```

## 🚀 Development Environment

### **Konfiguration**
```typescript
{
  // Supabase (Local Development)
  supabaseUrl: 'http://127.0.0.1:54321',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  supabaseServiceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  
  // API Configuration
  apiBaseUrl: 'http://localhost:3001',
  apiTimeout: 5000,
  
  // Offline Configuration
  maxQueueSize: 50,
  cacheDuration: 5 * 60 * 1000, // 5 Minuten
  cacheCleanupInterval: 2 * 60 * 1000, // 2 Minuten
  
  // Feature Flags
  enableOfflineMode: true,
  enableNotifications: false,
  enableBackgroundSync: false,
  enableDebugLogs: true,
  enablePerformanceMonitoring: true
}
```

### **Features**
- ✅ **Lokale Supabase-Instanz** für Development
- ✅ **Schnelleres Testing** mit kürzeren Cache-Dauern
- ✅ **Debug-Logs** für Entwicklung
- ✅ **Kleinere Queue** für besseres Testing
- ❌ **Notifications deaktiviert** (Development)
- ❌ **Background Sync deaktiviert** (Development)

## 🏭 Production Environment

### **Konfiguration**
```typescript
{
  // Supabase (Production)
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseAnonKey: 'YOUR_PRODUCTION_ANON_KEY',
  supabaseServiceRoleKey: 'YOUR_PRODUCTION_SERVICE_ROLE_KEY',
  
  // API Configuration
  apiBaseUrl: 'https://api.hngry.app',
  apiTimeout: 10000,
  
  // Offline Configuration
  maxQueueSize: 100,
  cacheDuration: 24 * 60 * 60 * 1000, // 24 Stunden
  cacheCleanupInterval: 60 * 60 * 1000, // 1 Stunde
  
  // Feature Flags
  enableOfflineMode: true,
  enableNotifications: true,
  enableBackgroundSync: true,
  enableDebugLogs: false,
  enablePerformanceMonitoring: true
}
```

### **Features**
- ✅ **Produktions-Supabase** mit echten Daten
- ✅ **Optimale Performance** mit längerer Cache-Dauer
- ✅ **Vollständige PWA-Features** aktiviert
- ✅ **Größere Queue** für bessere Offline-Erfahrung
- ✅ **Notifications aktiviert**
- ✅ **Background Sync aktiviert**
- ❌ **Debug-Logs deaktiviert** (Performance)

## 📋 Verwendung

### **In Components**
```typescript
import { environment, logDebug, logError } from '../config/environment';
import { supabase, supabaseService } from '../config/supabase';

// Environment-spezifische Logs
logDebug('User action', { userId: 123 });
logError('API Error', error);

// Supabase-Client verwenden
const { data, error } = await supabase.from('shopping_items').select('*');

// Oder Service-Funktionen
const items = await supabaseService.getShoppingItems();
```

### **In Services**
```typescript
import { environment, validateEnvironment } from '../config/environment';
import { initializeSupabase } from '../config/supabase';

class MyService {
  constructor() {
    validateEnvironment(); // Validiert Environment-Konfiguration
    initializeSupabase(); // Initialisiert Supabase-Verbindung
  }
  
  async makeRequest() {
    const url = `${environment.apiBaseUrl}/api/endpoint`;
    // ...
  }
}
```

## 🔍 Environment Detection

### **Automatische Erkennung**
```typescript
import { environmentInfo } from '../config/environment';

console.log(environmentInfo.mode); // 'development' oder 'production'
console.log(environmentInfo.isDevelopment); // true/false
console.log(environmentInfo.isProduction); // true/false
console.log(environmentInfo.version); // App Version
console.log(environmentInfo.buildTime); // Build Zeitstempel
```

### **Feature Detection**
```typescript
import { isOfflineModeEnabled, isDebugModeEnabled } from '../config/environment';

if (isOfflineModeEnabled()) {
  // Offline-Funktionalität aktivieren
}

if (isDebugModeEnabled()) {
  // Debug-Logs aktivieren
}
```

## 🛠️ Setup

### **1. Development**
```bash
npm run dev
```
Verwendet automatisch `env.development` Konfiguration.

### **2. Production Build**
```bash
npm run build
```
Verwendet automatisch `env.production` Konfiguration.

### **3. Custom Environment**
```bash
# Mit custom .env Datei
cp env.development .env.local
npm run dev
```

## 🔒 Security

### **Sensitive Data**
- Supabase Keys sollten in `.env.local` gespeichert werden
- `.env.local` ist in `.gitignore` enthalten
- Nur `VITE_*` Variablen sind im Client verfügbar
- Service Role Key sollte nur Server-seitig verwendet werden

### **Best Practices**
- Verwende immer `VITE_` Prefix für Client-Variablen
- Validiere Environment-Konfiguration beim Start
- Verwende TypeScript für Type Safety
- Dokumentiere alle Environment-Variablen
- Verwende Supabase Row Level Security (RLS)

## 📊 Monitoring

### **Environment Validation**
```typescript
validateEnvironment(); // Validiert required fields
```

### **Supabase Connection Test**
```typescript
initializeSupabase(); // Testet Supabase-Verbindung
```

### **Performance Monitoring**
```typescript
// Automatisch aktiviert in Production
if (environment.enablePerformanceMonitoring) {
  // Performance-Metriken sammeln
}
```

## 🎯 Vorteile

1. **Saubere Trennung** zwischen Dev und Prod
2. **Type Safety** durch TypeScript Interfaces
3. **Flexible Konfiguration** durch Environment-Variablen
4. **Automatische Validierung** der Konfiguration
5. **Feature Flags** für kontrollierte Rollouts
6. **Performance-Optimierung** je nach Environment
7. **Debugging-Support** in Development
8. **Produktions-Sicherheit** durch deaktivierte Debug-Features
9. **Supabase-Integration** mit lokaler und Produktions-Datenbank
10. **Service-Funktionen** für einfache Datenbank-Operationen

## 🔧 Supabase Setup

### **Development (Local)**
1. Installiere Supabase CLI: `npm install -g supabase`
2. Starte lokale Instanz: `supabase start`
3. Verwende die automatisch generierten Keys aus `env.development`

### **Production**
1. Erstelle Supabase-Projekt auf [supabase.com](https://supabase.com)
2. Kopiere Project URL und API Keys
3. Ersetze Platzhalter in `env.production`
4. Konfiguriere Row Level Security (RLS) Policies 