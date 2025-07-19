import { useCallback, useEffect } from 'react';
import {
  useGetItemsQuery,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
  useToggleItemCompletionMutation,
  useSearchItemsQuery,
} from '../api/shoppingItemsApi';
import type { CreateShoppingItemRequest, UpdateShoppingItemRequest } from '../api/mockApi';

// RTK Query Hook für Shopping Items
export const useShoppingItemsRTK = (listId: string) => {
  // Queries
  const {
    data: items = [],
    isLoading: loading,
    error,
    refetch: loadItems,
    isFetching,
    isSuccess,
    isError,
  } = useGetItemsQuery(listId);

  // Mutations
  const [createItemMutation, { isLoading: isCreating }] = useCreateItemMutation();
  const [updateItemMutation, { isLoading: isUpdating }] = useUpdateItemMutation();
  const [deleteItemMutation, { isLoading: isDeleting }] = useDeleteItemMutation();
  const [toggleItemCompletionMutation, { isLoading: isToggling }] = useToggleItemCompletionMutation();

  // Logs für Hook-Verhalten
  useEffect(() => {
    if (isSuccess && !loading) {
      console.log(`📊 [Hook] Data loaded successfully: ${items.length} items for list: ${listId}`);
    }
    if (isError) {
      console.error(`💥 [Hook] Error loading data for list: ${listId}`, error);
    }
    if (isFetching && !loading) {
      console.log(`🔄 [Hook] Refetching data for list: ${listId}`);
    }
  }, [items.length, loading, isSuccess, isError, isFetching, listId, error]);

  // Wrapper-Funktionen für bessere API-Kompatibilität
  const createItem = useCallback(async (itemData: CreateShoppingItemRequest) => {
    console.log(`➕ [Hook] Creating item: "${itemData.name}"`);
    try {
      const result = await createItemMutation(itemData).unwrap();
      console.log(`✅ [Hook] Successfully created item: "${result.name}"`);
      return result;
    } catch (err) {
      console.error('❌ [Hook] Failed to create item:', err);
      return null;
    }
  }, [createItemMutation]);

  const updateItem = useCallback(async (id: string, updates: UpdateShoppingItemRequest) => {
    console.log(`✏️ [Hook] Updating item ID: ${id}`);
    try {
      const result = await updateItemMutation({ id, updates }).unwrap();
      console.log(`✅ [Hook] Successfully updated item ID: ${id}`);
      return result;
    } catch (err) {
      console.error('❌ [Hook] Failed to update item:', err);
      return null;
    }
  }, [updateItemMutation]);

  const deleteItem = useCallback(async (id: string) => {
    console.log(`🗑️ [Hook] Deleting item ID: ${id}`);
    try {
      await deleteItemMutation(id).unwrap();
      console.log(`✅ [Hook] Successfully deleted item ID: ${id}`);
      return true;
    } catch (err) {
      console.error('❌ [Hook] Failed to delete item:', err);
      return false;
    }
  }, [deleteItemMutation]);

  const toggleItemCompletion = useCallback(async (id: string) => {
    console.log(`🔄 [Hook] Toggling completion for item ID: ${id}`);
    try {
      const result = await toggleItemCompletionMutation(id).unwrap();
      console.log(`✅ [Hook] Successfully toggled completion for item ID: ${id}`);
      return result;
    } catch (err) {
      console.error('❌ [Hook] Failed to toggle item completion:', err);
      return null;
    }
  }, [toggleItemCompletionMutation]);

  // Search-Funktion (Lazy Query)
  const searchItems = useCallback(async (query: string) => {
    console.log(`🔍 [Hook] Searching for: "${query}"`);
    // Für die Suche verwenden wir eine separate Query
    // In einer echten App würden wir hier die useLazyQuery verwenden
    // Für jetzt geben wir ein leeres Array zurück
    return [];
  }, []);

  // Error-Handling
  const errorMessage = error ? 
    ('data' in error ? String(error.data) : 'Unknown error') : 
    null;

  return {
    items,
    loading: loading || isCreating || isUpdating || isDeleting || isToggling,
    error: errorMessage,
    loadItems,
    createItem,
    updateItem,
    deleteItem,
    toggleItemCompletion,
    searchItems,
  };
}; 