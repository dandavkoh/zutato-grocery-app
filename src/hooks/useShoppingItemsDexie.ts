import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect } from 'react';
import { db, type ShoppingItem } from '../services/dexieService';
import { ShoppingItemsController } from '../api/supabaseApi';
import type { CreateShoppingItemRequest, UpdateShoppingItemRequest } from '../api/supabaseApi';

const shoppingItemsController = new ShoppingItemsController();

export const useShoppingItemsDexie = (listId: string) => {
  // Load items from Dexie using Live Query
  const items = useLiveQuery(
    () => db.shoppingItems
      .where('list_id')
      .equals(listId)
      .filter(item => !item.is_deleted)
      .reverse()
      .sortBy('created_at'),
    [listId]
  ) || [];

  // Sync with Supabase on mount and when coming back online
  useEffect(() => {
    if (listId) {
      // Fire and forget - sync with Supabase in background
      shoppingItemsController.getItems(listId).catch(error => {
        console.error('Background Supabase sync failed:', error);
      });
    }
  }, [listId]);

  // Note: Online status handling is now done in GlobalRealtimeProvider
  // to avoid circular imports

  // Create item
  const createItem = useCallback(async (itemData: CreateShoppingItemRequest) => {
    try {
      const response = await shoppingItemsController.createItem(itemData);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    } catch (err) {
      console.error('Error creating item:', err);
      throw err;
    }
  }, []);

  // Update item
  const updateItem = useCallback(async (id: string, updates: UpdateShoppingItemRequest) => {
    try {
      const response = await shoppingItemsController.updateItem(id, updates);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    } catch (err) {
      console.error('Error updating item:', err);
      throw err;
    }
  }, []);

  // Delete item
  const deleteItem = useCallback(async (id: string) => {
    try {
      const response = await shoppingItemsController.deleteItem(id, listId);
      if (response.error) {
        throw new Error(response.error);
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      throw err;
    }
  }, [listId]);

  // Set item completion
  const setItemCompletion = useCallback(async (id: string, isCompleted: boolean) => {
    try {
      // Use the setItemCompletion method
      const response = await shoppingItemsController.setItemCompletion(id, isCompleted);
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data;
    } catch (err) {
      console.error('Error setting item completion:', err);
      throw err;
    }
  }, []);

  // Refresh items from Supabase
  const refreshItems = useCallback(async () => {
    try {
      console.log('Refreshing shopping items from Supabase...');
      const response = await shoppingItemsController.getItems(listId);
      if (response.error) {
        throw new Error(response.error);
      }
      console.log('Shopping items refreshed successfully');
      return response.data;
    } catch (err) {
      console.error('Error refreshing items:', err);
      throw err;
    }
  }, [listId]);

  return {
    items,
    loading: items === undefined, // Live Query loading state
    error: null, // Live Query handles errors internally
    createItem,
    updateItem,
    deleteItem,
    setItemCompletion,
    refreshItems,
  };
}; 