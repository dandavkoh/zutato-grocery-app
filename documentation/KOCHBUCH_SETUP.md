# Kochbuch Feature Setup

## Übersicht
Das Kochbuch-Feature ermöglicht es Benutzern, ihre Lieblingsrezepte zu speichern und von der Einkaufsliste aus darauf zuzugreifen.

## Einrichtung

### 1. Environment Variable
Füge folgende Zeile zu deiner `.env`-Datei hinzu:

```bash
VITE_SITE_URL=http://localhost:3000
```

**Wichtig:** Ersetze `http://localhost:3000` mit der tatsächlichen URL deiner Rezepte-Website.

### 2. Datenbank-Migrationen
Das Feature basiert auf den folgenden SQL-Migrationen:
- `20240104000000_add_recipe_system.sql` - Grundlegende Rezept-Tabellen
- `20240105000000_add_sort_order_to_units_and_categories.sql` - Sortierreihenfolge
- `20240107000000_add_recipe_ratings.sql` - Rezept-Bewertungen
- `20240108000000_add_cookbook_favorites.sql` - Benutzer-Kochbuch

### 3. Features

#### Kochbuch-Seite (`/cookbook`)
- Zeigt alle Favoriten-Rezepte des Benutzers
- Leere Ansicht mit CTA zur Rezepte-Website
- Rezept-Karten mit Bild, Titel, Kochzeit und Bewertung
- Möglichkeit, Rezepte aus dem Kochbuch zu entfernen

#### Navigation
- Kochbuch-Button in der unteren Leiste der Einkaufsliste
- Tab-Navigation zwischen Einkaufsliste und Kochbuch
- Zurück-Navigation zur vorherigen Einkaufsliste

#### Rezept-Öffnung
- Rezepte öffnen in neuem Tab
- URL-Format: `{VITE_SITE_URL}/rezepte/{id}/{slug}`
- Automatische Slug-Generierung für deutsche Umlaute

## Verwendung

### Als Benutzer
1. Klicke auf "Kochbuch" in der unteren Leiste der Einkaufsliste
2. Füge Rezepte über die externe Rezepte-Website hinzu
3. Sieh alle Favoriten in der Kochbuch-Übersicht
4. Klicke auf ein Rezept, um es in einem neuen Tab zu öffnen
5. Entferne Rezepte mit dem Herz-Button (erscheint beim Hover)

### Als Entwickler
- `useCookbookRecipes` Hook für Datenbank-Operationen
- `CookbookPage` Komponente für die Hauptseite
- `slugify` Utility für URL-freundliche Slugs
- Vollständige TypeScript-Unterstützung

## Technische Details

### Datenbank-Tabellen
- `user_cookbook_recipes` - Benutzer-Favoriten
- `recipes` - Rezept-Metadaten
- `recipe_ratings` - Benutzer-Bewertungen
- `recipe_units` - Maßeinheiten

### Sicherheit
- Row Level Security (RLS) aktiviert
- Benutzer können nur ihre eigenen Favoriten verwalten
- Alle Datenbank-Operationen sind authentifiziert

### Performance
- Optimierte Datenbank-Abfragen mit Joins
- Lazy Loading für Rezept-Bilder
- Effiziente State-Verwaltung mit React Hooks

## Nächste Schritte

1. **Rezept-Integration**: Verbinde das Kochbuch mit der externen Rezepte-Website
2. **Zutaten-Überführung**: Implementiere die Funktion, Zutaten direkt in die Einkaufsliste zu überführen
3. **Offline-Support**: Erweitere um Offline-Funktionalität
4. **Synchronisation**: Füge Echtzeit-Synchronisation zwischen Geräten hinzu

## Fehlerbehebung

### Häufige Probleme
- **Fehlende VITE_SITE_URL**: Überprüfe die .env-Datei
- **Datenbank-Fehler**: Stelle sicher, dass alle Migrationen ausgeführt wurden
- **Authentifizierung**: Benutzer muss angemeldet sein

### Debugging
- Überprüfe die Browser-Konsole für Fehlermeldungen
- Verwende die React Developer Tools für State-Inspektion
- Überprüfe die Netzwerk-Tab für API-Aufrufe
