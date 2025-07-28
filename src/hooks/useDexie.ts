import { useState, useEffect, useCallback } from 'react';
import { dexieService, type ShoppingItem } from '../services/dexieService';

export const useDexie = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getShoppingItemsByListId = useCallback(async (listId: string): Promise<ShoppingItem[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await dexieService.getShoppingItemsByListId(listId);
      return items;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ [useDexie] Error getting shopping items:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAllShoppingItems = useCallback(async (): Promise<ShoppingItem[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await dexieService.getAllShoppingItems();
      return items;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ [useDexie] Error getting all shopping items:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncShoppingItems = useCallback(async (items: ShoppingItem[]): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await dexieService.syncShoppingItems(items);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ [useDexie] Error syncing shopping items:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addShoppingItem = useCallback(async (item: ShoppingItem): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await dexieService.addShoppingItem(item);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ [useDexie] Error adding shopping item:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateShoppingItem = useCallback(async (item: ShoppingItem): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await dexieService.updateShoppingItem(item);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ [useDexie] Error updating shopping item:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteShoppingItem = useCallback(async (id: string, deletedBy: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await dexieService.deleteShoppingItem(id, deletedBy);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ [useDexie] Error deleting shopping item:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAllData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await dexieService.clearAllData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ [useDexie] Error clearing data:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getStats = useCallback(async () => {
    try {
      return await dexieService.getStats();
    } catch (err) {
      console.error('❌ [useDexie] Error getting stats:', err);
      return { total: 0, active: 0, deleted: 0 };
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    
    // Actions
    getShoppingItemsByListId,
    getAllShoppingItems,
    syncShoppingItems,
    addShoppingItem,
    updateShoppingItem,
    deleteShoppingItem,
    clearAllData,
    getStats,
    clearError
  };
}; 