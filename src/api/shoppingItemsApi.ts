import { createApi } from '@reduxjs/toolkit/query/react';
import { supabaseBaseQuery } from './supabaseApiAdapter';
import type { 
  ShoppingItem, 
  CreateShoppingItemRequest, 
  UpdateShoppingItemRequest
} from './supabaseApi';

// RTK Query API für Shopping Items
export const shoppingItemsApi = createApi({
  reducerPath: 'shoppingItemsApi',
  baseQuery: supabaseBaseQuery, // Supabase API Adapter verwenden
  tagTypes: ['ShoppingItem'],
  endpoints: (builder) => ({
    // Alle Items für eine List abrufen
    getItems: builder.query<ShoppingItem[], string>({
      query: (listId) => ({
        url: `/api/shopping-items/${listId}`,
        method: 'GET',
      }),
      // Cache für 3 Minuten (180 Sekunden)
      keepUnusedDataFor: 180,
      providesTags: (result, error, listId) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ShoppingItem' as const, id })),
              { type: 'ShoppingItem', id: 'LIST' }
            ]
          : [{ type: 'ShoppingItem', id: 'LIST' }],
      // Logs für Cache-Verhalten
      async onQueryStarted(listId, { queryFulfilled, getState }) {
        // Prüfen ob Daten bereits im Cache sind
        const state = getState() as any;
        const queryKey = `getItems("${listId}")`;
        const queryState = state.shoppingItemsApi.queries[queryKey];
        
        if (queryState && queryState.data && !queryState.isLoading) {
          console.log(`⚡ [RTK Query] Using CACHED data for list: ${listId} (${queryState.data.length} items)`);
          return; // Kein API-Call nötig
        }
        
        console.log(`🔄 [RTK Query] Starting DATABASE query for list: ${listId}`);
        
        try {
          const { data } = await queryFulfilled;
          console.log(`✅ [RTK Query] Successfully loaded ${data.length} items from DATABASE for list: ${listId}`);
        } catch (error) {
          console.error(`❌ [RTK Query] Failed to load items from DATABASE for list: ${listId}`, error);
        }
      },
      // Logs für Cache-Entry Lifecycle
      async onCacheEntryAdded(
        listId,
        { dispatch, getState, cacheEntryRemoved, cacheDataLoaded }
      ) {
        try {
          // Warten bis Cache-Daten geladen sind
          const { data } = await cacheDataLoaded;
          
          // Cache-Entry wurde entfernt (z.B. nach 3 Minuten)
          await cacheEntryRemoved;
          console.log(`🗑️ [RTK Query] Cache entry removed for list: ${listId} (after 3 minutes)`);
        } catch {
          // Cache-Entry wurde entfernt bevor Daten geladen wurden
        }
      },
    }),

    // Items nach Kategorie abrufen
    getItemsByCategory: builder.query<ShoppingItem[], { listId: string; category: string }>({
      query: ({ listId, category }) => ({
        url: `/api/shopping-items/${listId}/category/${encodeURIComponent(category)}`,
        method: 'GET',
      }),
      keepUnusedDataFor: 180,
      providesTags: (result, error, { listId, category }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ShoppingItem' as const, id })),
              { type: 'ShoppingItem', id: `CATEGORY-${category}` }
            ]
          : [{ type: 'ShoppingItem', id: `CATEGORY-${category}` }],
      async onQueryStarted({ listId, category }, { queryFulfilled, getState }) {
        // Prüfen ob Daten bereits im Cache sind
        const state = getState() as any;
        const queryKey = `getItemsByCategory({"listId":"${listId}","category":"${category}"})`;
        const queryState = state.shoppingItemsApi.queries[queryKey];
        
        if (queryState && queryState.data && !queryState.isLoading) {
          console.log(`⚡ [RTK Query] Using CACHED data for category: ${category} (${queryState.data.length} items)`);
          return;
        }
        
        console.log(`🔄 [RTK Query] Starting DATABASE query for category: ${category} in list: ${listId}`);
        
        try {
          const { data } = await queryFulfilled;
          console.log(`✅ [RTK Query] Successfully loaded ${data.length} items for category "${category}" from DATABASE`);
        } catch (error) {
          console.error(`❌ [RTK Query] Failed to load items for category "${category}" from DATABASE`, error);
        }
      },
    }),

    // Abgeschlossene Items abrufen
    getCompletedItems: builder.query<ShoppingItem[], string>({
      query: (listId) => ({
        url: `/api/shopping-items/${listId}/completed`,
        method: 'GET',
      }),
      keepUnusedDataFor: 180,
      providesTags: (result, error, listId) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ShoppingItem' as const, id })),
              { type: 'ShoppingItem', id: 'COMPLETED' }
            ]
          : [{ type: 'ShoppingItem', id: 'COMPLETED' }],
      async onQueryStarted(listId, { queryFulfilled, getState }) {
        // Prüfen ob Daten bereits im Cache sind
        const state = getState() as any;
        const queryKey = `getCompletedItems("${listId}")`;
        const queryState = state.shoppingItemsApi.queries[queryKey];
        
        if (queryState && queryState.data && !queryState.isLoading) {
          console.log(`⚡ [RTK Query] Using CACHED data for completed items (${queryState.data.length} items)`);
          return;
        }
        
        console.log(`🔄 [RTK Query] Starting DATABASE query for completed items in list: ${listId}`);
        
        try {
          const { data } = await queryFulfilled;
          console.log(`✅ [RTK Query] Successfully loaded ${data.length} completed items from DATABASE`);
        } catch (error) {
          console.error(`❌ [RTK Query] Failed to load completed items from DATABASE`, error);
        }
      },
    }),

    // Neues Item erstellen
    createItem: builder.mutation<ShoppingItem, CreateShoppingItemRequest>({
      query: (itemData) => ({
        url: '/api/shopping-items',
        method: 'POST',
        body: itemData,
      }),
      // Optimistic Update: Item sofort zum Cache hinzufügen
      async onQueryStarted(itemData, { dispatch, queryFulfilled, getState }) {
        console.log(`➕ [RTK Query] Creating new item: "${itemData.name}" (Optimistic Update)`);
        
        const patchResult = dispatch(
          shoppingItemsApi.util.updateQueryData('getItems', itemData.listId, (draft) => {
            const newItem: ShoppingItem = {
              id: `temp-${Date.now()}`, // Temporäre ID
              ...itemData,
              isCompleted: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            draft.push(newItem);
          })
        );
        try {
          const { data: newItem } = await queryFulfilled;
          console.log(`✅ [RTK Query] Successfully created item: "${newItem.name}" in DATABASE`);
          
          // Temporäre ID durch echte ID ersetzen
          dispatch(
            shoppingItemsApi.util.updateQueryData('getItems', itemData.listId, (draft) => {
              const index = draft.findIndex(item => item.id === `temp-${Date.now() - 1000}`);
              if (index !== -1) {
                draft[index] = newItem;
              }
            })
          );
        } catch (error) {
          console.error(`❌ [RTK Query] Failed to create item: "${itemData.name}" in DATABASE`, error);
          // Bei Fehler: Optimistic Update rückgängig machen
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, { listId }) => [
        { type: 'ShoppingItem', id: 'LIST' },
        { type: 'ShoppingItem', id: 'COMPLETED' }
      ],
    }),

    // Item aktualisieren
    updateItem: builder.mutation<ShoppingItem, { id: string; updates: UpdateShoppingItemRequest }>({
      query: ({ id, updates }) => ({
        url: `/api/shopping-items/${id}`,
        method: 'PUT',
        body: updates,
      }),
      // Optimistic Update: Item sofort im Cache aktualisieren
      async onQueryStarted({ id, updates }, { dispatch, queryFulfilled, getState }) {
        console.log(`✏️ [RTK Query] Updating item ID: ${id} (Optimistic Update)`);
        
        const patchResult = dispatch(
          shoppingItemsApi.util.updateQueryData('getItems', 'list-1', (draft) => {
            const item = draft.find(item => item.id === id);
            if (item) {
              Object.assign(item, updates, { updatedAt: new Date().toISOString() });
            }
          })
        );
        try {
          await queryFulfilled;
          console.log(`✅ [RTK Query] Successfully updated item ID: ${id} in DATABASE`);
        } catch (error) {
          console.error(`❌ [RTK Query] Failed to update item ID: ${id} in DATABASE`, error);
          // Bei Fehler: Optimistic Update rückgängig machen
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'ShoppingItem', id },
        { type: 'ShoppingItem', id: 'LIST' },
        { type: 'ShoppingItem', id: 'COMPLETED' }
      ],
    }),

    // Item löschen (Soft Delete)
    deleteItem: builder.mutation<null, string>({
      query: (id) => ({
        url: `/api/shopping-items/${id}`,
        method: 'DELETE',
      }),
      // Optimistic Update: Item sofort als gelöscht markieren
      async onQueryStarted(id, { dispatch, queryFulfilled, getState }) {
        console.log(`🗑️ [RTK Query] Soft deleting item ID: ${id} (Optimistic Update)`);
        
        const patchResult = dispatch(
          shoppingItemsApi.util.updateQueryData('getItems', 'list-1', (draft) => {
            const item = draft.find(item => item.id === id);
            if (item) {
              item.deleted = true;
              item.updatedAt = new Date().toISOString();
            }
          })
        );
        try {
          await queryFulfilled;
          console.log(`✅ [RTK Query] Successfully soft deleted item ID: ${id} in DATABASE`);
        } catch (error) {
          console.error(`❌ [RTK Query] Failed to soft delete item ID: ${id} in DATABASE`, error);
          // Bei Fehler: Optimistic Update rückgängig machen
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, id) => [
        { type: 'ShoppingItem', id },
        { type: 'ShoppingItem', id: 'LIST' },
        { type: 'ShoppingItem', id: 'COMPLETED' }
      ],
    }),

    // Item Completion togglen
    toggleItemCompletion: builder.mutation<ShoppingItem, string>({
      query: (id) => ({
        url: `/api/shopping-items/${id}/toggle`,
        method: 'PATCH',
      }),
      // Optimistic Update: Completion Status sofort togglen
      async onQueryStarted(id, { dispatch, queryFulfilled, getState }) {
        console.log(`🔄 [RTK Query] Toggling completion for item ID: ${id} (Optimistic Update)`);
        
        const patchResult = dispatch(
          shoppingItemsApi.util.updateQueryData('getItems', 'list-1', (draft) => {
            const item = draft.find(item => item.id === id);
            if (item) {
              item.isCompleted = !item.isCompleted;
              item.updatedAt = new Date().toISOString();
            }
          })
        );
        try {
          await queryFulfilled;
          console.log(`✅ [RTK Query] Successfully toggled completion for item ID: ${id} in DATABASE`);
        } catch (error) {
          console.error(`❌ [RTK Query] Failed to toggle completion for item ID: ${id} in DATABASE`, error);
          // Bei Fehler: Optimistic Update rückgängig machen
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, id) => [
        { type: 'ShoppingItem', id },
        { type: 'ShoppingItem', id: 'LIST' },
        { type: 'ShoppingItem', id: 'COMPLETED' }
      ],
    }),

    // Items suchen
    searchItems: builder.query<ShoppingItem[], { listId: string; query: string }>({
      query: ({ listId, query }) => ({
        url: `/api/shopping-items/${listId}/search`,
        method: 'GET',
        params: { q: query },
      }),
      keepUnusedDataFor: 60, // Kürzerer Cache für Suchergebnisse
      providesTags: (result, error, { listId, query }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ShoppingItem' as const, id })),
              { type: 'ShoppingItem', id: `SEARCH-${query}` }
            ]
          : [{ type: 'ShoppingItem', id: `SEARCH-${query}` }],
      async onQueryStarted({ listId, query }, { queryFulfilled, getState }) {
        // Prüfen ob Daten bereits im Cache sind
        const state = getState() as any;
        const queryKey = `searchItems({"listId":"${listId}","query":"${query}"})`;
        const queryState = state.shoppingItemsApi.queries[queryKey];
        
        if (queryState && queryState.data && !queryState.isLoading) {
          console.log(`⚡ [RTK Query] Using CACHED data for search: "${query}" (${queryState.data.length} items)`);
          return;
        }
        
        console.log(`🔍 [RTK Query] Starting DATABASE search for: "${query}" in list: ${listId}`);
        
        try {
          const { data } = await queryFulfilled;
          console.log(`✅ [RTK Query] Found ${data.length} items for search: "${query}" from DATABASE`);
        } catch (error) {
          console.error(`❌ [RTK Query] Failed to search for: "${query}"`, error);
        }
      },
    }),
  }),
});

// Export der generierten Hooks
export const {
  useGetItemsQuery,
  useGetItemsByCategoryQuery,
  useGetCompletedItemsQuery,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
  useToggleItemCompletionMutation,
  useSearchItemsQuery,
} = shoppingItemsApi; 