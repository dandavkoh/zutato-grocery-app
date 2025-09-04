import React, { useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setHeader, resetHeader, resetBackClick, updateSelectedItem } from '../stores/store';
import type { RootState } from '../stores/store';
import { useCategoriesDexie } from '../hooks/useCategoriesDexie';
import { getCategoryNameById } from '../api/supabaseApi';
import { shoppingItemsApi } from '../api/supabaseApi';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import type { ShoppingItem } from '../api/supabaseApi';
import { sentryErrorService } from '../services/sentryErrorService';

const CategorySelectPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { listId, productId } = useParams<{ listId: string; productId: string }>();
  const dispatch = useDispatch();
  
  // Get item from global store only
  const item = useSelector((state: RootState) => state.selectedItem.item);
  
  // Use the categories hook to get categories
  const { categories, loading } = useCategoriesDexie();
  const sortedCategories = [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  
  // Get current category name
  const currentCategoryName = item ? getCategoryNameById(item.category_id, categories) : '';

  // Watch for back button events
  const backClicked = useSelector((state: RootState) => state.events.backClicked);

  useEffect(() => {
    dispatch(setHeader({
      title: 'Kategorie wechseln',
      showBack: true,
      background: '',
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch]);

  // Handle back button events
  useEffect(() => {
    if (backClicked) {
      navigate(`/shopping-list/${listId}/product/${productId}`);
      dispatch(resetBackClick());
    }
  }, [backClicked, navigate, dispatch, listId, productId]);

  // Handle category selection
  const handleCategorySelect = async (categoryId: string | null) => {
    if (!item) return;
    
    try {
      // Update the item's category
      const response = await shoppingItemsApi.updateItem(item.id, {
        category_id: categoryId
      });
      
      if (response.error) {
        console.error('Failed to update category:', response.error);
        // Optionally show an error message to the user
        return;
      }
      
      // Update the item in global store
      dispatch(updateSelectedItem({
        category_id: categoryId
      }));
      
      // Navigate back to the product detail page
      navigate(`/shopping-list/${listId}/product/${productId}`);
    } catch (error) {
      console.error('Error updating category:', error);
      sentryErrorService.reportApiError(error, {
        url: 'category-select-update',
        method: 'PUT',
      });
      // Optionally show an error message to the user
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-700">Lade Kategorien...</div>
      ) : (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
           <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {sortedCategories.map((cat, idx) => (
              <div key={cat.id} className={idx < sortedCategories.length - 1 ? 'border-b border-gray-200' : ''}>
                <button
                  className="flex items-center px-5 py-3 w-full text-left hover:bg-orange-50 transition-colors"
                  onClick={() => handleCategorySelect(cat.id)}
                >
                  <div className="w-12 flex justify-center mr-4 text-gray-600">
                    <FontAwesomeIcon icon={cat.icon} size="3xl" style="regular"/>
                  </div>
                  <span className="text-base text-gray-900 flex-1">{cat.name}</span>
                  {cat.id === item?.category_id && (
                    <span className="text-orange-600">
                      <FontAwesomeIcon icon="fa-circle-check" size="xl" style="regular"/>
                    </span>
                  )}
                </button>
              </div>
            ))}
            <div className="border-t border-gray-200" />
            <button
              className="flex items-center px-5 py-3 w-full text-left hover:bg-orange-50 transition-colors"
              onClick={() => handleCategorySelect(null)}
            >
              <div className="w-12 flex justify-center mr-4 text-gray-600">
                <FontAwesomeIcon icon="basket-shopping" size="3xl" style="regular"/>
              </div>
              <span className="text-base text-gray-900 flex-1">Keine Kategorie</span>
              {!item?.category_id && (
                <span className="text-orange-600">
                  <FontAwesomeIcon icon="fa-circle-check" size="xl" style="regular"/>
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySelectPage; 