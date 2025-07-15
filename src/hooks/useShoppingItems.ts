import { useState, useEffect, useCallback } from 'react';
import { shoppingItemsApi } from '../api/mockApi';
import type { ShoppingItem, CreateShoppingItemRequest, UpdateShoppingItemRequest } from '../api/mockApi';

export const useShoppingItems = (householdId: string) => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all items
  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await shoppingItemsApi.getItems(householdId);
      
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setItems(response.data);
      }
    } catch (err) {
      setError('Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  // Create new item
  const createItem = useCallback(async (itemData: CreateShoppingItemRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await shoppingItemsApi.createItem(itemData);
      
      if (response.error) {
        setError(response.error);
        return null;
      } else if (response.data) {
        setItems(prev => [...prev, response.data!]);
        return response.data;
      }
    } catch (err) {
      setError('Failed to create item');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update item
  const updateItem = useCallback(async (id: string, updates: UpdateShoppingItemRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await shoppingItemsApi.updateItem(id, updates);
      
      if (response.error) {
        setError(response.error);
        return null;
      } else if (response.data) {
        setItems(prev => prev.map(item => 
          item.id === id ? response.data! : item
        ));
        return response.data;
      }
    } catch (err) {
      setError('Failed to update item');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete item
  const deleteItem = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await shoppingItemsApi.deleteItem(id);
      
      if (response.error) {
        setError(response.error);
        return false;
      } else {
        setItems(prev => prev.filter(item => item.id !== id));
        return true;
      }
    } catch (err) {
      setError('Failed to delete item');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Toggle item completion
  const toggleItemCompletion = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await shoppingItemsApi.toggleItemCompletion(id);
      
      if (response.error) {
        setError(response.error);
        return null;
      } else if (response.data) {
        setItems(prev => prev.map(item => 
          item.id === id ? response.data! : item
        ));
        return response.data;
      }
    } catch (err) {
      setError('Failed to toggle item completion');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Search items
  const searchItems = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await shoppingItemsApi.searchItems(householdId, query);
      
      if (response.error) {
        setError(response.error);
        return [];
      } else if (response.data) {
        return response.data;
      }
      return [];
    } catch (err) {
      setError('Failed to search items');
      return [];
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  // Load items on mount
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return {
    items,
    loading,
    error,
    loadItems,
    createItem,
    updateItem,
    deleteItem,
    toggleItemCompletion,
    searchItems
  };
}; 