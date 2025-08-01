# ZUTATO - Progressive Web App (PWA)

## 🚀 PWA Features

ZUTATO ist jetzt eine vollständige Progressive Web App mit folgenden Features:

### ✅ PWA-Funktionen
- **Offline-Funktionalität**: App funktioniert auch ohne Internetverbindung
- **Installierbar**: Kann auf dem Homescreen installiert werden
- **Push-Benachrichtigungen**: Unterstützung für Benachrichtigungen
- **Auto-Updates**: Automatische Updates im Hintergrund
- **Responsive Design**: Optimiert für alle Bildschirmgrößen

### 📱 Installation

#### Android (Chrome)
1. Öffne die App in Chrome
2. Tippe auf das Menü (⋮)
3. Wähle "Zum Startbildschirm hinzufügen"
4. Bestätige die Installation

#### iOS (Safari)
1. Öffne die App in Safari
2. Tippe auf das Teilen-Symbol (□↑)
3. Wähle "Zum Home-Bildschirm"
4. Bestätige die Installation

#### Desktop (Chrome/Edge)
1. Öffne die App im Browser
2. Klicke auf das Install-Symbol in der Adressleiste
3. Bestätige die Installation

### 🔧 Technische Details

#### Service Worker
- **Caching-Strategie**: Cache-First für statische Assets
- **Runtime Caching**: Für API-Calls und dynamische Inhalte
- **Background Sync**: Für Offline-Operationen

#### Manifest
- **Name**: ZUTATO - Einkaufsliste
- **Theme Color**: #fbbf24 (Gelb)
- **Background Color**: #000000 (Schwarz)
- **Display Mode**: Standalone
- **Orientation**: Portrait-Primary

#### Icons
- Verschiedene Größen: 72x72 bis 512x512
- Maskable Icons für adaptive Icons
- Apple Touch Icons für iOS

### 🛠️ Entwicklung

#### Build
```bash
npm run build
```

#### Preview
```bash
npm run preview
```

#### PWA-Test
1. Baue die App: `npm run build`
2. Starte den Preview-Server: `npm run preview`
3. Öffne Chrome DevTools
4. Gehe zu "Application" > "Manifest"
5. Überprüfe PWA-Score

### 📊 PWA Score

Die App sollte einen hohen PWA-Score erreichen:
- ✅ HTTPS
- ✅ Web App Manifest
- ✅ Service Worker
- ✅ Responsive Design
- ✅ Fast Loading
- ✅ Offline-Funktionalität

### 🔄 Updates

Die App unterstützt automatische Updates:
- Updates werden im Hintergrund heruntergeladen
- Benutzer werden über verfügbare Updates informiert
- Ein-Klick-Update-Funktion

### 📱 Offline-Funktionalität

- **Caching**: Alle wichtigen Assets werden gecacht
- **Offline-First**: App funktioniert auch ohne Internet
- **Sync**: Änderungen werden synchronisiert, sobald Online

### 🔔 Benachrichtigungen

- **Permission Request**: Benutzer können Benachrichtigungen erlauben
- **Custom Notifications**: Für Updates und wichtige Events
- **Badge Support**: Für unread counts

### 🎨 Design

- **Adaptive Icons**: Passen sich an verschiedene Icon-Formen an
- **Splash Screen**: Native App-Erscheinung
- **Theme Integration**: Vollständige Integration in das System-Theme

### 📈 Performance

- **Lazy Loading**: Komponenten werden bei Bedarf geladen
- **Code Splitting**: Optimierte Bundle-Größe
- **Caching**: Intelligentes Caching für bessere Performance

### 🔒 Sicherheit

- **HTTPS Only**: Alle Verbindungen sind verschlüsselt
- **Content Security Policy**: Schutz vor XSS-Angriffen
- **Secure Headers**: Zusätzliche Sicherheits-Header

---

**ZUTATO** - Deine intelligente Einkaufsliste als Progressive Web App! 🛒📱 