import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../stores/store';
import { useShoppingItemsDexie } from './useShoppingItemsDexie';
import type { ProductGroup } from '../api/supabaseApi';

export const useProductInList = () => {
  const currentListId = useSelector((state: RootState) => state.currentList.listId);
  const { items } = useShoppingItemsDexie(currentListId || '');

  const isProductInList = useMemo(() => {
    return (productTitle: string): boolean => {
      if (!currentListId || !items) return false;
      
      // Check if any active item in the current list has the same name as the product
      // An item is considered active if it's not deleted and not completed
      return items.some((item: any) => 
        item.name.toLowerCase() === productTitle.toLowerCase() &&
        !item.is_deleted &&
        !item.is_completed
      );
    };
  }, [currentListId, items]);

  return {
    isProductInList,
    currentListId,
    items,
    refreshItems: () => {} // Dexie Live Query updates automatically, no manual refresh needed
  };
}; 