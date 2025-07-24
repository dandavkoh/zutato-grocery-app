import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setHeader, resetHeader, resetBackClick, updateSelectedItem } from '../stores/store';
import type { RootState } from '../stores/store';
import { useCategories } from '../hooks/useCategories';
import { getCategoryNameById } from '../api/supabaseApi';
import { shoppingItemsApi } from '../api/supabaseApi';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import type { ShoppingItem } from '../api/supabaseApi';

const CategorySelectPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  // Get item from global store only
  const item = useSelector((state: RootState) => state.selectedItem.item);
  
  // Use the categories hook to get categories
  const { categories, loading } = useCategories();
  
  // Get current category name
  const currentCategoryName = item ? getCategoryNameById(item.category_id, categories) : '';

  // Watch for back button events
  const backClicked = useSelector((state: RootState) => state.events.backClicked);

  useEffect(() => {
    dispatch(setHeader({
      title: 'Kategorie wechseln',
      showBack: true,
      background: 'bg-yellow-400',
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch]);

  // Handle back button events
  useEffect(() => {
    if (backClicked) {
      navigate(-1);
      dispatch(resetBackClick());
    }
  }, [backClicked, navigate, dispatch]);

  // Handle category selection
  const handleCategorySelect = async (categoryId: string) => {
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
      
      // Navigate back to the previous page
      navigate(-1);
    } catch (error) {
      console.error('Error updating category:', error);
      // Optionally show an error message to the user
    }
  };

  return (
    <div className="w-full pb-8 pt-2">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Lade Kategorien...</div>
        </div>
      ) : (
        categories.map((cat) => (
          <button
            key={cat.id}
            className="flex items-center px-5 py-3 border-b border-neutral-800 bg-neutral-900 w-full text-left hover:bg-neutral-800 transition-colors"
            onClick={() => handleCategorySelect(cat.id)}
          >
            <div className="w-12 flex justify-center mr-4">
              <span className="text-gray-300">
                <FontAwesomeIcon icon={cat.icon} size="3xl" style="regular"/>
              </span>
            </div>
            <span className="text-lg text-gray-300 flex-1">{cat.name}</span>
            {cat.name === currentCategoryName && (
              <span className="text-yellow-400">
                <FontAwesomeIcon icon="fa-circle-check" size="xl" style="regular"/>
              </span>
            )}
          </button>
        ))
      )}
    </div>
  );
};

export default CategorySelectPage; 