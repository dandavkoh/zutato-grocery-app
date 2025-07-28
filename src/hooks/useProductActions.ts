import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedItem } from '../stores/store';
import type { RootState } from '../stores/store';
import { useAuth } from '../contexts/AuthContext';
import { shoppingItemsApi } from '../api/supabaseApi';
import type { ProductGroup, ShoppingItem } from '../api/supabaseApi';

export const useProductActions = (refreshItems?: () => void) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const currentListId = useSelector((state: RootState) => state.currentList.listId);

  const handleProductAction = useCallback(async (product: ProductGroup) => {
    if (!currentListId || !user) {
      console.error('No current list or user found');
      return;
    }

    try {
      // Check if product already exists in the current list
      const existingItems = await shoppingItemsApi.getItems(currentListId);
      
      if (existingItems.error) {
        console.error('Failed to get existing items:', existingItems.error);
        return;
      }

      // Find active item (not deleted and not completed) with the same name
      const existingItem = existingItems.data?.find(item => 
        item.name.toLowerCase() === product.title.toLowerCase() &&
        !item.is_deleted &&
        !item.is_completed
      );

      if (existingItem) {
        // Product exists - navigate to product detail page
        dispatch(setSelectedItem(existingItem));
        navigate('/product');
      } else {
        // Product doesn't exist - create new item (no navigation)
        const newItemData = {
          name: product.title,
          category_id: product.default_category_id || null, // Convert empty string to null
          icon: product.default_icon,
          listId: currentListId,
          createdBy: user.id,
          is_completed: false,
        };

        const createResponse = await shoppingItemsApi.createItem(newItemData);
        
        if (createResponse.error) {
          console.error('Failed to create item:', createResponse.error);
          return;
        }

        // Item created successfully - refresh the items list to update the UI
        console.log('Item added successfully:', createResponse.data);
        if (refreshItems) {
          refreshItems();
        }
      }
    } catch (error) {
      console.error('Error handling product action:', error);
    }
  }, [currentListId, user, navigate, dispatch, refreshItems]);

  return {
    handleProductAction,
    currentListId,
    user
  };
}; 