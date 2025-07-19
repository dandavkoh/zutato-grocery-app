# RTK Query Implementation für Shopping Items

## Übersicht

Diese Implementierung verwendet RTK Query von Redux Toolkit, um die Shopping Items Daten zu cachen und die Performance zu verbessern. Die Daten werden für 3 Minuten gecacht und automatisch bei Mutationen aktualisiert.

## Hauptfunktionen

### 🚀 Cache-Management
- **3-Minuten Cache**: Daten werden für 3 Minuten gecacht
- **Automatische Invalidierung**: Cache wird bei Mutationen automatisch aktualisiert
- **Optimistic Updates**: Änderungen werden sofort angezeigt, bevor die API antwortet

### ⚡ Performance-Optimierungen
- **Keine unnötigen API-Calls**: Bei Navigation werden gecachte Daten verwendet
- **Deduplication**: Identische Requests werden dedupliziert
- **Background Updates**: Daten werden im Hintergrund aktualisiert

### 🔄 Optimistic Updates
- **Sofortige UI-Updates**: Änderungen werden sofort angezeigt
- **Automatischer Rollback**: Bei Fehlern werden Änderungen rückgängig gemacht
- **Bessere UX**: Keine Wartezeiten für Benutzer

## Dateistruktur

```
src/
├── api/
│   ├── supabaseApi.ts          # Bestehende Supabase-API
│   ├── supabaseApiAdapter.ts       # Adapter für RTK Query
│   └── shoppingItemsApi.ts     # RTK Query API Definition
├── hooks/
│   └── useShoppingItemsRTK.ts  # RTK Query Hook (mit Cache)
└── store.ts                    # Redux Store mit RTK Query
```

## API Endpoints

### Queries (GET)
- `GET /api/shopping-items/:listId` - Alle Items abrufen
- `GET /api/shopping-items/:listId/category/:category` - Items nach Kategorie
- `GET /api/shopping-items/:listId/completed` - Abgeschlossene Items
- `GET /api/shopping-items/:listId/search?q=:query` - Items suchen

### Mutations (POST/PUT/DELETE/PATCH)
- `POST /api/shopping-items` - Neues Item erstellen
- `PUT /api/shopping-items/:id` - Item aktualisieren
- `DELETE /api/shopping-items/:id` - Item löschen
- `PATCH /api/shopping-items/:id/toggle` - Completion Status togglen

## Verwendung

### In Komponenten

```typescript
import { useShoppingItemsRTK } from './hooks/useShoppingItemsRTK';

const MyComponent = () => {
  const { items, loading, error, toggleItemCompletion } = useShoppingItemsRTK('list-1');
  
  // Items werden automatisch gecacht und bei Bedarf geladen
  // toggleItemCompletion führt Optimistic Updates durch
};
```

### Direkte Mutationen

```typescript
import { useCreateItemMutation, useDeleteItemMutation } from './api/shoppingItemsApi';

const MyComponent = () => {
  const [createItem] = useCreateItemMutation();
  const [deleteItem] = useDeleteItemMutation();
  
  const handleCreate = async () => {
    await createItem({
      name: 'Neues Item',
      category: 'Obst',
      listId: 'list-1',
      addedBy: 'user-1'
    });
  };
};
```

## Cache-Verhalten

### Cache-Dauer
- **Normale Queries**: 3 Minuten (180 Sekunden)
- **Suchergebnisse**: 1 Minute (60 Sekunden)

### Cache-Invalidierung
- **Bei Erstellung**: `LIST` und `COMPLETED` Tags werden invalidiert
- **Bei Update**: Spezifisches Item und `LIST`/`COMPLETED` Tags
- **Bei Löschung**: Spezifisches Item und `LIST`/`COMPLETED` Tags
- **Bei Toggle**: Spezifisches Item und `LIST`/`COMPLETED` Tags

### Optimistic Updates
1. **Erstellung**: Item wird sofort mit temporärer ID hinzugefügt
2. **Update**: Item wird sofort im Cache aktualisiert
3. **Löschung**: Item wird sofort aus Cache entfernt
4. **Toggle**: Completion Status wird sofort geändert

## Vorteile

1. **Bessere Performance**: Keine unnötigen API-Calls
2. **Bessere UX**: Sofortige UI-Updates
3. **Automatisches Caching**: 3-Minuten Cache mit automatischer Invalidierung
4. **Fehlerbehandlung**: Automatischer Rollback bei Optimistic Updates
5. **Deduplication**: Identische Requests werden nur einmal ausgeführt
6. **Background Updates**: Daten werden im Hintergrund aktualisiert

## Technische Details

### Store-Konfiguration
```typescript
export const store = configureStore({
  reducer: {
    // ... andere Reducer
    [shoppingItemsApi.reducerPath]: shoppingItemsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(shoppingItemsApi.middleware),
});
```

### Tag-basierte Cache-Invalidierung
```typescript
providesTags: (result, error, listId) =>
  result
    ? [
        ...result.map(({ id }) => ({ type: 'ShoppingItem' as const, id })),
        { type: 'ShoppingItem', id: 'LIST' }
      ]
    : [{ type: 'ShoppingItem', id: 'LIST' }],
```

### Optimistic Updates
```typescript
async onQueryStarted(id, { dispatch, queryFulfilled, getState }) {
  const patchResult = dispatch(
    shoppingItemsApi.util.updateQueryData('getItems', 'list-1', (draft) => {
      // Optimistische Änderung
    })
  );
  try {
    await queryFulfilled;
  } catch {
    patchResult.undo(); // Rollback bei Fehler
  }
}
``` 