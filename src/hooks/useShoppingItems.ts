import { useState, useEffect, useCallback } from 'react';
import { ShoppingItemsController } from '../api/supabaseApi';
import type { ShoppingItem, CreateShoppingItemRequest, UpdateShoppingItemRequest } from '../api/supabaseApi';

const shoppingItemsController = new ShoppingItemsController();

export const useShoppingItems = (listId: string) => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load items
  const loadItems = useCallback(async () => {
    if (!listId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await shoppingItemsController.getItems(listId);
      if (response.error) {
        setError(response.error);
      } else {
        setItems(response.data || []);
      }
    } catch (err) {
      setError('Failed to load items');
      console.error('Error loading items:', err);
    } finally {
      setLoading(false);
    }
  }, [listId]);

  // Load items on mount and when listId changes
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Create item
  const createItem = useCallback(async (itemData: CreateShoppingItemRequest) => {
    try {
      const response = await shoppingItemsController.createItem(itemData);
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Add new item to the list
      setItems(prev => [response.data!, ...prev]);
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
      
      // Update item in the list
      setItems(prev => prev.map(item => 
        item.id === id ? response.data! : item
      ));
      return response.data;
    } catch (err) {
      console.error('Error updating item:', err);
      throw err;
    }
  }, []);

  // Delete item
  const deleteItem = useCallback(async (id: string) => {
    try {
      const response = await shoppingItemsController.deleteItem(id);
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Remove item from the list
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Error deleting item:', err);
      throw err;
    }
  }, []);

  // Toggle item completion
  const toggleItemCompletion = useCallback(async (id: string) => {
    try {
      // Find the current item to get its completion status
      const currentItem = items.find(item => item.id === id);
      if (!currentItem) {
        throw new Error('Item not found');
      }
      
      // Calculate new completion status
      const newCompletionStatus = !currentItem.is_completed;
      
      // Use the new setItemCompletion method (more efficient)
      const response = await shoppingItemsController.setItemCompletion(id, newCompletionStatus);
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Update item in the list
      setItems(prev => prev.map(item => 
        item.id === id ? response.data! : item
      ));
      return response.data;
    } catch (err) {
      console.error('Error toggling item completion:', err);
      throw err;
    }
  }, [items]);

  // Search items
  const searchItems = useCallback(async (query: string) => {
    if (!listId) return [];
    
    try {
      const response = await shoppingItemsController.searchItems(listId, query);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || [];
    } catch (err) {
      console.error('Error searching items:', err);
      return [];
    }
  }, [listId]);

  return {
    items,
    loading,
    error,
    loadItems,
    createItem,
    updateItem,
    deleteItem,
    toggleItemCompletion,
    searchItems,
  };
}; 