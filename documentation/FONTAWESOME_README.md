# Font Awesome Integration

## Übersicht

Font Awesome Pro 6.7.2 ist vollständig in die App integriert und funktioniert sowohl online als auch offline in der PWA.

## Installation

Die Font Awesome Dateien befinden sich im `public/fontawesome/` Ordner:
- CSS-Dateien: `public/fontawesome/css/`
- Font-Dateien: `public/fontawesome/webfonts/`

## Einbindung

Font Awesome wird über die `index.html` eingebunden:
```html
<link rel="stylesheet" href="/fontawesome/css/all.min.css" />
```

## PWA-Caching

Font Awesome Dateien werden automatisch für offline Nutzung gecacht:
- Cache-Strategie: `CacheFirst`
- Cache-Dauer: 1 Jahr
- Cache-Name: `fontawesome-cache`

## Verwendung

### Icon-Klassen

**Regular Icons (Outline-Stil):**
```html
<i className="far fa-trash"></i>
<i className="far fa-plus"></i>
<i className="far fa-check"></i>
```

**Solid Icons (Füllstil):**
```html
<i className="fas fa-trash"></i>
<i className="fas fa-plus"></i>
<i className="fas fa-check"></i>
```

**Brand Icons (Marken):**
```html
<i className="fab fa-facebook"></i>
<i className="fab fa-github"></i>
<i className="fab fa-twitter"></i>
```

### Verfügbare Icon-Stile

1. **Regular** (`far`): Outline-Stil, 400 weight
2. **Solid** (`fas`): Füllstil, 900 weight  
3. **Light** (`fal`): Leichter Stil, 300 weight
4. **Thin** (`fat`): Dünner Stil, 100 weight
5. **Duotone** (`fad`): Zweifarbiger Stil
6. **Brands** (`fab`): Marken-Icons

### Häufig verwendete Icons

#### Navigation
- `fa-home` - Startseite
- `fa-arrow-left` - Zurück
- `fa-chevron-down` - Dropdown
- `fa-search` - Suche

#### Aktionen
- `fa-plus` - Hinzufügen
- `fa-minus` - Entfernen
- `fa-edit` - Bearbeiten
- `fa-trash` - Löschen
- `fa-save` - Speichern
- `fa-check` - Bestätigen
- `fa-times` - Abbrechen

#### Einkaufsliste
- `fa-shopping-cart` - Einkaufswagen
- `fa-list` - Liste
- `fa-tag` - Kategorie
- `fa-cube` - Produkt
- `fa-store` - Geschäft

#### Benutzer
- `fa-user` - Benutzer
- `fa-users` - Benutzergruppe
- `fa-bell` - Benachrichtigung
- `fa-cog` - Einstellungen

#### Status
- `fa-star` - Favorit
- `fa-heart` - Gefällt mir
- `fa-eye` - Anzeigen
- `fa-lock` - Geschützt
- `fa-wifi` - Verbunden

## Styling

Icons können mit Tailwind CSS Klassen gestylt werden:

```html
<!-- Größe -->
<i className="fas fa-home text-sm"></i>      <!-- Klein -->
<i className="fas fa-home text-lg"></i>      <!-- Groß -->
<i className="fas fa-home text-2xl"></i>     <!-- Sehr groß -->
<i className="fas fa-home text-4xl"></i>     <!-- Extra groß -->

<!-- Farbe -->
<i className="fas fa-trash text-red-500"></i>
<i className="fas fa-check text-green-500"></i>
<i className="fas fa-info text-blue-500"></i>

<!-- Kombinationen -->
<i className="fas fa-star text-yellow-400 text-2xl hover:text-yellow-600"></i>
```

## Performance

- Font Awesome wird als minifizierte CSS-Datei geladen
- Font-Dateien werden als WOFF2 (modern) und TTF (Fallback) bereitgestellt
- Alle Dateien werden für offline Nutzung gecacht
- Icons werden als Font-Glyphen gerendert (schnell und skalierbar)

## Troubleshooting

### Icons werden nicht angezeigt

1. Überprüfe die Browser-Konsole auf Fehler
2. Stelle sicher, dass die Font-Dateien geladen werden
3. Überprüfe die CSS-Klassen (z.B. `far` vs `fas`)

### Icons sehen anders aus

- `far` = Regular (Outline)
- `fas` = Solid (Füllstil)
- `fab` = Brands (Marken)

### Performance-Probleme

- Verwende nur die benötigten Icons
- Vermeide zu viele Icons auf einer Seite
- Nutze die minifizierte CSS-Datei (`all.min.css`)

## Links

- [Font Awesome Icons](https://fontawesome.com/icons)
- [Font Awesome Dokumentation](https://fontawesome.com/docs)
- [Icon-Suche](https://fontawesome.com/search) 