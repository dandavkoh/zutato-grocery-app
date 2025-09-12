import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedItem } from '../stores/store';
import type { RootState } from '../stores/store';
import { useAuth } from '../contexts/AuthContext';
import { shoppingItemsApi } from '../api/supabaseApi';
import { generateGuid } from '../utils/guidUtils';
import type { ProductOrGroup } from '../api/supabaseApi';
import { dexieService } from '../services/dexieService';
import { useToast } from '../contexts/ToastContext';
import { sentryErrorService } from '../services/sentryErrorService';

export const useProductActions = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const currentListId = useSelector((state: RootState) => state.currentList.listId);
  const { showToast } = useToast();

  const handleProductAction = useCallback(async (product: ProductOrGroup) => {
    if (!currentListId || !user) {
      console.error('No current list or user found');
      return;
    }

    try {
      // Check if product already exists in the current list via Dexie (no network request)
      const existingItems = await dexieService.getShoppingItemsByListId(currentListId);

      // Find active item (not deleted and not completed) with the same name
      // AND without notes - items with notes are considered "not existing"
      const existingItem = existingItems.find(item => 
        item.name.toLowerCase() === product.title.toLowerCase() &&
        !item.is_deleted &&
        !item.is_completed &&
        !item.notes // Item must not have notes to be considered existing
      );

      if (existingItem) {
        // Map Dexie item shape to API ShoppingItem shape expected by the store
        const mappedItem = {
          id: existingItem.id,
          name: existingItem.name,
          category_id: existingItem.category_id,
          icon: existingItem.icon ?? undefined,
          unit_id: existingItem.unit_id ?? undefined,
          quantity: existingItem.quantity ?? undefined,
          is_completed: existingItem.is_completed,
          is_deleted: existingItem.is_deleted,
          created_at: existingItem.created_at,
          updatedAt: existingItem.updated_at,
          listId: existingItem.list_id,
          createdBy: existingItem.created_by,
          notes: existingItem.notes ?? undefined,
          store: existingItem.store ?? undefined,
          assignedTo: existingItem.assigned_to ?? undefined,
        } as const;
        // Product exists - navigate to product detail page
        dispatch(setSelectedItem(mappedItem));
        navigate(`/shopping-list/${currentListId}/product/${mappedItem.id}`);
      } else {
        // Product doesn't exist - create new item (fire & forget)
        const newItemData = {
          id: generateGuid(), // Generate standard GUID (with hyphens)
          name: product.title,
          category_id: product.category_id || null, // Convert empty string to null
          icon: product.icon,
          listId: currentListId,
          createdBy: user.id,
        };

        // Fire and forget - don't await the result
        shoppingItemsApi.createItem(newItemData)
          .then(() => {
            showToast(`${newItemData.name} hinzugefügt`, { type: 'success' });
          })
          .catch(error => {
          console.error('Failed to create item (fire & forget):', error);
            showToast('Fehler beim Hinzufügen', { type: 'error' });
          });

        console.log('Item creation initiated (fire & forget):', newItemData.name);
      }
    } catch (error) {
      console.error('Error handling product action:', error);
      sentryErrorService.reportApiError(error, {
        url: 'product-action',
        method: 'POST',
      });
    }
  }, [currentListId, user, navigate, dispatch]);

  return {
    handleProductAction,
    currentListId,
    user
  };
}; 