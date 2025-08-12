import React, { useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setHeader, resetHeader, resetBackClick, updateSelectedItem } from '../stores/store';
import type { RootState } from '../stores/store';
import { useUnitsDexie } from '../hooks/useUnitsDexie';
import { getUnitNameById } from '../api/supabaseApi';
import { shoppingItemsApi } from '../api/supabaseApi';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import type { ShoppingItem, Unit } from '../api/supabaseApi';

const UnitSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { listId, productId } = useParams<{ listId: string; productId: string }>();
  const dispatch = useDispatch();
  
  // Get item from global store only
  const item = useSelector((state: RootState) => state.selectedItem.item);
  
  // Use the units hook to get units
  const { units, loading } = useUnitsDexie();
  const sortedUnits = [...units].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  
  // Get current unit
  const currentUnit = item?.unit_id ? units.find(u => u.id === item.unit_id) : null;

  // Watch for back button events
  const backClicked = useSelector((state: RootState) => state.events.backClicked);

  useEffect(() => {
    dispatch(setHeader({
      title: 'Einheit',
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

  // Handle unit selection
  const handleUnitSelect = async (unitId: string | null) => {
    if (!item) return;
    
    try {
      // Update the item's unit
      const response = await shoppingItemsApi.updateItem(item.id, {
        unit_id: unitId
      });
      
      if (response.error) {
        console.error('Failed to update unit:', response.error);
        // Optionally show an error message to the user
        return;
      }
      
      // Update the item in global store
      dispatch(updateSelectedItem({
        unit_id: unitId
      }));
      
      // Navigate back to the product detail page
      navigate(`/shopping-list/${listId}/product/${productId}`);
    } catch (error) {
      console.error('Error updating unit:', error);
      // Optionally show an error message to the user
    }
  };

  const formatUnitDisplay = (unit: Unit | null) => {
    if (!unit) return '';
    return `${unit.name} (${unit.short_name})`;
  };

  const isSelected = (unit: Unit | null) => {
    if (!unit || !currentUnit) return false;
    return unit.name === currentUnit.name && unit.short_name === currentUnit.short_name;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-700">Lädt Einheiten...</div>
        ) : units.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Keine Einheiten gefunden.</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <button
              className="flex items-center px-5 py-3 w-full text-left hover:bg-orange-50 transition-colors"
              onClick={() => handleUnitSelect(null)}
            >
              <span className="text-base text-gray-900 flex-1">Keine Einheit</span>
              {!item?.unit_id && (
                <span className="text-orange-600">
                  <FontAwesomeIcon icon="fa-circle-check" size="xl" style="regular"/>
                </span>
              )}
            </button>
            <div className="border-t border-gray-200" />
            {sortedUnits.map((unit, index) => (
              <div key={index} className={index < sortedUnits.length - 1 ? 'border-b border-gray-200' : ''}>
                <button
                  className="flex items-center px-5 py-3 w-full text-left hover:bg-orange-50 transition-colors"
                  onClick={() => handleUnitSelect(unit.id)}
                >
                  <span className="text-base text-gray-900 flex-1">{formatUnitDisplay(unit)}</span>
                  {unit.id === item?.unit_id && (
                    <span className="text-orange-600">
                      <FontAwesomeIcon icon="fa-circle-check" size="xl" style="regular"/>
                    </span>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnitSelectPage; 