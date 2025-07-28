import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setHeader, resetHeader, resetBackClick, resetRightButtonClick, updateSelectedItem } from '../stores/store';
import type { RootState } from '../stores/store';
import { useCategories } from '../hooks/useCategories';
import { useUnits } from '../hooks/useUnits';
import { getCategoryNameById, getCategoryIconById, getUnitNameById, shoppingItemsApi } from '../api/supabaseApi';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import type { ShoppingItem } from '../api/supabaseApi';

const ProductDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  // Get item from global store only
  const item = useSelector((state: RootState) => state.selectedItem.item);
  
  // State for notes editing
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  // State for quantity editing
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [quantityValue, setQuantityValue] = useState('');
  const [isSavingQuantity, setIsSavingQuantity] = useState(false);

  // Use the categories hook to get categories
  const { categories } = useCategories();
  
  // Use the units hook to get units
  const { units } = useUnits();
  
  // Get category name and icon from current item
  const categoryName = item ? getCategoryNameById(item.category_id, categories) : '';
  const categoryIcon = item ? getCategoryIconById(item.category_id, categories) : 'basket-shopping';

  // Initialize notes value when item changes
  useEffect(() => {
    if (item) {
      setNotesValue(item.notes || '');
      setQuantityValue(item.quantity?.toString() || '');
    }
  }, [item]);

  // Watch for events
  const backClicked = useSelector((state: RootState) => state.events.backClicked);
  const rightButtonClicked = useSelector((state: RootState) => state.events.rightButtonClicked);

  useEffect(() => {
    dispatch(setHeader({
      title: item?.name || 'Produkt',
      showBack: true,
      showRightButton: true,
      background: 'bg-gradient-to-b from-yellow-400 to-yellow-500',
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch, item]);

  // Handle back button events
  useEffect(() => {
    if (backClicked) {
      navigate(-1);
      dispatch(resetBackClick());
    }
  }, [backClicked, navigate, dispatch]);

  // Handle right button events
  useEffect(() => {
    if (rightButtonClicked) {
      // Handle right button click - for now just log it
      console.log('Right button clicked');
      dispatch(resetRightButtonClick());
    }
  }, [rightButtonClicked, dispatch]);

  // Handle notes editing
  const handleNotesEdit = () => {
    setIsEditingNotes(true);
  };

  // Position cursor at the end when entering edit mode
  useEffect(() => {
    if (isEditingNotes) {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        const length = textarea.value.length;
        textarea.setSelectionRange(length, length);
      }
    }
  }, [isEditingNotes]);

  const handleNotesSave = async () => {
    if (!item) return;
    
    setIsSavingNotes(true);
    try {
      const response = await shoppingItemsApi.updateItem(item.id, {
        notes: notesValue
      });
      
      if (response.error) {
        console.error('Failed to update notes:', response.error);
        return;
      }
      
      // Update the item in global store
      dispatch(updateSelectedItem({
        notes: notesValue
      }));
      
      setIsEditingNotes(false);
    } catch (error) {
      console.error('Error updating notes:', error);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleNotesCancel = () => {
    setNotesValue(item?.notes || '');
    setIsEditingNotes(false);
  };

  // Handle quantity editing
  const handleQuantityEdit = () => {
    setIsEditingQuantity(true);
  };

  // Handle quantity input change with validation
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or valid numbers (including decimals)
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setQuantityValue(value);
    }
  };

  const handleQuantitySave = async () => {
    if (!item) return;
    
    // Check if the trimmed value is empty and set to undefined, otherwise parse as float
    const trimmedValue = quantityValue.trim();
    const quantity = trimmedValue === '' ? undefined : parseFloat(trimmedValue);
    
    console.log('Saving quantity:', {
      originalValue: item.quantity,
      inputValue: quantityValue,
      trimmedValue: trimmedValue,
      parsedQuantity: quantity,
      isUndefined: quantity === undefined
    });
    
    setIsSavingQuantity(true);
    try {
      // Create update object with explicit undefined handling
      const updateData: any = {};
      if (quantity === undefined) {
        updateData.quantity = null; // Use null for database
      } else {
        updateData.quantity = quantity;
      }
      
      const response = await shoppingItemsApi.updateItem(item.id, updateData);
      
      if (response.error) {
        console.error('Failed to update quantity:', response.error);
        return;
      }
      
      console.log('Quantity updated successfully:', response.data);
      
      // Update the item in global store with explicit undefined handling
      const storeUpdate: any = {};
      if (quantity === undefined) {
        storeUpdate.quantity = undefined;
      } else {
        storeUpdate.quantity = quantity;
      }
      
      dispatch(updateSelectedItem(storeUpdate));
      
      setIsEditingQuantity(false);
    } catch (error) {
      console.error('Error updating quantity:', error);
    } finally {
      setIsSavingQuantity(false);
    }
  };

  const handleQuantityCancel = () => {
    setQuantityValue(item?.quantity?.toString() || '');
    setIsEditingQuantity(false);
  };

  // If no item data is available, show a fallback
  if (!item) {
    return (
      <div className="w-full pb-8 pt-2">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Produktdaten nicht verfügbar</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-8 pt-2">
      <div className="flex flex-col gap-3">
        {/* Läden */}
        <div className="border-b border-neutral-800 bg-neutral-900 px-5 py-4">
          <div className="text-xs text-gray-400 mb-1">LÄDEN</div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">
              {item.store
                ? item.store
                : 'Wähle den Laden aus, das diesem Produkt zugeordnet werden soll.'
              }
            </span>
            <FontAwesomeIcon className="w-5 h-5 text-gray-500 ml-2" icon="fa-chevron-right" size="base" style="regular"/>
          </div>
        </div>
        {/* Personen */}
        <div className="border-b border-neutral-800 bg-neutral-900 px-5 py-4">
          <div className="text-xs text-gray-400 mb-1">PERSONEN</div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">
              {item.assignedTo
                ? item.assignedTo
                : 'Wähle Person aus, die diesem Produkt zugeordnet werden soll.'
              }
            </span>
            <FontAwesomeIcon className="w-5 h-5 text-gray-500 ml-2" icon="fa-chevron-right" size="base" style="regular"/>
          </div>
        </div>
        {/* Notiz */}
        <div className="border-b border-neutral-800 bg-neutral-900 px-5 py-4">
          <div className="text-xs text-gray-400 mb-1">NOTIZ</div>
          {isEditingNotes ? (
            <div className="space-y-3">
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="Notiz hinzufügen"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-yellow-400 resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleNotesCancel}
                  disabled={isSavingNotes}
                  className="flex-1 bg-neutral-700 text-gray-200 font-semibold py-2 px-4 rounded-lg hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleNotesSave}
                  disabled={isSavingNotes}
                  className="flex-1 bg-yellow-400 text-black font-semibold py-2 px-4 rounded-lg hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingNotes ? 'Speichern...' : 'Speichern'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleNotesEdit}
              className="w-full text-left hover:bg-neutral-800 -mx-5 px-5 py-2 rounded-lg transition-colors"
            >
              <div className="text-gray-300">
                {item.notes || 'Notiz hinzufügen'}
              </div>
            </button>
          )}
        </div>
        {/* Menge & Einheit */}
        <div className="flex gap-2">
          <div className="flex-1 bg-neutral-900 border-b border-neutral-800 py-4 px-5 rounded-r-lg">
            <div className="text-xs text-gray-400 mb-1">MENGE</div>
            {isEditingQuantity ? (
              <div className="space-y-3">
                <input
                  type="text"
                  inputMode="decimal"
                  value={quantityValue}
                  onChange={handleQuantityChange}
                  placeholder="Menge eingeben"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleQuantityCancel}
                    disabled={isSavingQuantity}
                    className="flex-1 bg-neutral-700 text-gray-200 font-semibold py-2 px-4 rounded-lg hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleQuantitySave}
                    disabled={isSavingQuantity}
                    className="flex-1 bg-yellow-400 text-black font-semibold py-2 px-4 rounded-lg hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingQuantity ? 'Speichern...' : 'Speichern'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleQuantityEdit}
                className="w-full text-left hover:bg-neutral-800 -mx-5 px-5 py-2 rounded-lg transition-colors"
              >
                <div className="text-gray-300">
                  {item.quantity || 'Menge eingeben'}
                </div>
              </button>
            )}
          </div>
          <button
            className="flex-1 bg-neutral-900 border-b border-neutral-800 py-4 px-5 flex items-center justify-between text-left rounded-l-lg"
            onClick={() => navigate('/product/unit', { state: { item: item } })}
          >
            <div>
              <div className="text-xs text-gray-400 mb-1">EINHEIT</div>
              <div className="text-gray-300">
                {item.unit_id ? getUnitNameById(item.unit_id, units) : 'Einheit eingeben'}
              </div>
            </div>
            <FontAwesomeIcon className="w-5 h-5 text-gray-500 ml-2" icon="fa-chevron-right" size="base" style="regular"/>
          </button>
        </div>
        {/* Kategorie wechseln */}
        <button
          className="bg-neutral-900 border-b border-neutral-800 px-5 py-4 w-full text-left"
          onClick={() => navigate('/product/category', { state: { item: item } })}
        >
          <div className="text-xs text-gray-400 mb-1">KATEGORIE WECHSELN</div>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={categoryIcon} size="2xl" style="regular"/>
            <span className="text-gray-300">{categoryName}</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default ProductDetailPage; 