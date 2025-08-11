import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setHeader, resetHeader, resetBackClick, resetRightButtonClick, updateSelectedItem } from '../stores/store';
import type { RootState } from '../stores/store';
import { useCategoriesDexie } from '../hooks/useCategoriesDexie';
import { useUnitsDexie } from '../hooks/useUnitsDexie';
import { getCategoryNameById, getCategoryIconById, getUnitNameById, shoppingItemsApi } from '../api/supabaseApi';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import { useToast } from '../contexts/ToastContext';
import type { ShoppingItem } from '../api/supabaseApi';

const ProductDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { listId, productId } = useParams<{ listId: string; productId: string }>();
  const dispatch = useDispatch();
  const { showToast } = useToast();
  
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
  const { categories } = useCategoriesDexie();
  
  // Use the units hook to get units
  const { units } = useUnitsDexie();
  
  // Get category name and icon from current item
  const categoryName = item ? (item.category_id ? getCategoryNameById(item.category_id, categories) : 'Keine Kategorie') : '';
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
      background: '',
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch, item]);

  // Handle back button events
  useEffect(() => {
    if (backClicked) {
      navigate(`/shopping-list/${listId}`);
      dispatch(resetBackClick());
    }
  }, [backClicked, navigate, dispatch, listId]);

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
        showToast('Fehler beim Aktualisieren', { type: 'error' });
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
        showToast('Fehler beim Aktualisieren', { type: 'error' });
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
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64 text-gray-600">Produktdaten nicht verfügbar</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Läden & Personen */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Läden</div>
            <div className="flex items-center justify-between">
              <span className="text-gray-900">
                {item.store
                  ? item.store
                  : 'Wähle den Laden aus, das diesem Produkt zugeordnet werden soll.'
                }
              </span>
              <FontAwesomeIcon className="w-5 h-5 text-gray-400 ml-2" icon="fa-chevron-right" size="base" style="regular"/>
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="text-xs text-gray-500 mb-1">Personen</div>
            <div className="flex items-center justify-between">
              <span className="text-gray-900">
                {item.assignedTo
                  ? item.assignedTo
                  : 'Wähle Person aus, die diesem Produkt zugeordnet werden soll.'
                }
              </span>
              <FontAwesomeIcon className="w-5 h-5 text-gray-400 ml-2" icon="fa-chevron-right" size="base" style="regular"/>
            </div>
          </div>
        </div>

        {/* Notiz */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <div className="text-xs text-gray-500 mb-2">Notiz</div>
          {isEditingNotes ? (
            <div className="space-y-3">
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="Notiz hinzufügen"
                className="w-full bg-gray-50 border border-gray-400 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40 resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleNotesCancel}
                  disabled={isSavingNotes}
                  className="flex-1 bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleNotesSave}
                  disabled={isSavingNotes}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingNotes ? 'Speichern...' : 'Speichern'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleNotesEdit}
              className="w-full text-left hover:bg-orange-50 -mx-5 px-5 py-2 rounded-lg transition-colors"
            >
              <div className="text-gray-900">
                {item.notes || 'Notiz hinzufügen'}
              </div>
            </button>
          )}
        </div>

        {/* Menge & Einheit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <div className="text-xs text-gray-500 mb-2">Menge</div>
            {isEditingQuantity ? (
              <div className="space-y-3">
                <input
                  type="text"
                  inputMode="decimal"
                  value={quantityValue}
                  onChange={handleQuantityChange}
                  placeholder="Menge eingeben"
                  className="w-full bg-gray-50 border border-gray-400 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:outline-none focus:border-orange-600"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleQuantityCancel}
                    disabled={isSavingQuantity}
                    className="flex-1 bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleQuantitySave}
                    disabled={isSavingQuantity}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingQuantity ? 'Speichern...' : 'Speichern'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleQuantityEdit}
                className="w-full text-left hover:bg-orange-50 -mx-5 px-5 py-2 rounded-lg transition-colors"
              >
                <div className="text-gray-900">
                  {item.quantity || 'Menge eingeben'}
                </div>
              </button>
            )}
          </div>
          <button
            className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 text-left flex items-center justify-between"
            onClick={() => navigate(`/shopping-list/${listId}/product/${productId}/unit`, { state: { item: item } })}
          >
            <div>
              <div className="text-xs text-gray-500 mb-2">Einheit</div>
              <div className="text-gray-900">
                {item.unit_id ? getUnitNameById(item.unit_id, units) : 'Einheit eingeben'}
              </div>
            </div>
            <FontAwesomeIcon className="w-5 h-5 text-gray-400 ml-2" icon="fa-chevron-right" size="base" style="regular"/>
          </button>
        </div>

        {/* Kategorie wechseln */}
        <button
          className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4 w-full text-left hover:bg-orange-50"
          onClick={() => navigate(`/shopping-list/${listId}/product/${productId}/category`, { state: { item: item } })}
        >
          <div className="text-xs text-gray-500 mb-2">Kategorie wechseln</div>
          <div className="flex items-center gap-2">
            <span className="text-gray-700"><FontAwesomeIcon icon={categoryIcon} size="2xl" style="regular"/></span>
            <span className="text-gray-900">{categoryName}</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default ProductDetailPage; 