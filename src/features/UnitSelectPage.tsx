import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setHeader, resetHeader, resetBackClick, updateSelectedItem } from '../stores/store';
import type { RootState } from '../stores/store';
import { useUnits } from '../hooks/useUnits';
import { getUnitNameById } from '../api/supabaseApi';
import { shoppingItemsApi } from '../api/supabaseApi';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import type { ShoppingItem, Unit } from '../api/supabaseApi';

const UnitSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  // Get item from global store only
  const item = useSelector((state: RootState) => state.selectedItem.item);
  
  // Use the units hook to get units
  const { units, loading } = useUnits();
  
  // Get current unit
  const currentUnit = item?.unit_id ? units.find(u => u.id === item.unit_id) : null;

  // Watch for back button events
  const backClicked = useSelector((state: RootState) => state.events.backClicked);

  useEffect(() => {
    dispatch(setHeader({
      title: 'Einheit',
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

  // Handle unit selection
  const handleUnitSelect = async (unitId: string) => {
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
      
      // Navigate back to the previous page
      navigate(-1);
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
    <div className="w-full pb-8 pt-2">
      {loading ? (
        <div className="text-center py-8">Lädt Einheiten...</div>
      ) : units.length === 0 ? (
        <div className="text-center py-8">Keine Einheiten gefunden.</div>
      ) : (
        units.map((unit, index) => (
          <button
            key={index}
            className="flex items-center px-5 py-3 border-b border-neutral-800 bg-neutral-900 w-full text-left hover:bg-neutral-800 transition-colors"
            onClick={() => handleUnitSelect(unit.id)}
          >
            <span className="text-lg text-gray-300 flex-1">{formatUnitDisplay(unit)}</span>
            {isSelected(unit) && (
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

export default UnitSelectPage; 