import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setHeader, resetHeader, resetFilterClick, setSelectedItem, setCurrentList } from '../stores/store';
import type { RootState } from '../stores/store';
import { useShoppingItemsDexie } from '../hooks/useShoppingItemsDexie';
import { useListDexie } from '../hooks/useListsDexie';
import { useCategoriesDexie } from '../hooks/useCategoriesDexie';
import { useUnitsDexie } from '../hooks/useUnitsDexie';
import { groupItemsByCategory, separateCompletedItems, getUnitShortNameById } from '../api/supabaseApi';
import SwipeAction from '../components/SwipeAction';
import FontAwesomeIcon from '../components/FontAwesomeIcon';

const ShoppingListPage: React.FC = () => {
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const navigate = useNavigate();
  const { listId } = useParams<{ listId: string }>();
  const inputRef = useRef<HTMLInputElement>(null);
  const dispatch = useDispatch();
  
  // Set current list in global store
  useEffect(() => {
    if (listId) {
      dispatch(setCurrentList(listId));
    }
  }, [listId, dispatch]);
  
  // Redirect if no listId is provided
  useEffect(() => {
    if (!listId) {
      console.log('ShoppingListPage - No listId found, redirecting to /lists');
      navigate('/lists');
    }
  }, [listId, navigate]);
  
  // Don't render if no listId
  if (!listId) {
    console.log('ShoppingListPage - Rendering null because no listId');
    return null;
  }
  
  // Use the shopping items hook
  const { items, loading, error, setItemCompletion, deleteItem } = useShoppingItemsDexie(listId);
  
  // Use the list hook to get the list name
  const { list, loading: listLoading } = useListDexie(listId);
  
  // Use the categories hook to get categories
  const { categories, loading: categoriesLoading } = useCategoriesDexie();
  
  // Use the units hook to get units
  const { units, loading: unitsLoading } = useUnitsDexie();
  
  // Group items by category and separate completed items
  const { completed, incomplete } = separateCompletedItems(items as any);
  const groupedIncompleteItems = groupItemsByCategory(incomplete as any, categories);

  // Watch for filter click events
  const filterClicked = useSelector((state: RootState) => state.events.filterClicked);

  useEffect(() => {
    dispatch(setHeader({
      title: list?.name || 'Lade...',
      showBack: false,
      background: 'bg-yellow-400',
      showSearchBar: true,
      showFilterIcon: true,
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch, list?.name]);

  // Handle filter click events
  useEffect(() => {
    if (filterClicked) {
      setSortSheetOpen(true);
      dispatch(resetFilterClick());
    }
  }, [filterClicked, dispatch]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(toggleDebounceRef.current).forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
    };
  }, []);

  const handleItemClick = (itemId: string) => {
    // Navigate to product detail page with item data
    const item = items.find(i => i.id === itemId);
    if (item) {
      dispatch(setSelectedItem(item as any)); // Set the selected item in the global store
      navigate('/product', { 
        state: { item } 
      });
    }
  };

  // Debounce function to prevent rapid clicks
  const toggleDebounceRef = useRef<{ [key: string]: number }>({});

  const handleToggleCompletion = useCallback((itemId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    
    // Find the current item to get its completion status
    const currentItem = items.find(item => item.id === itemId);
    if (!currentItem) return;
    
    // Calculate new completion status
    const newCompletionStatus = !currentItem.is_completed;
    
    // Clear existing timeout for this item
    if (toggleDebounceRef.current[itemId]) {
      clearTimeout(toggleDebounceRef.current[itemId]);
    }
    // Set a new timeout to prevent rapid clicks
    toggleDebounceRef.current[itemId] = window.setTimeout(() => {
      // Fire and forget - don't await the result for better UX
      setItemCompletion(itemId, newCompletionStatus).catch((error: any) => {
        console.error('Failed to set item completion:', error);
        // Optionally show a toast notification here
      });
      // Clean up the timeout reference
      delete toggleDebounceRef.current[itemId];
    }, 100); // 100ms debounce
  }, [setItemCompletion, items]);

  const handleDeleteItem = (itemId: string) => {
    // Fire and forget - don't await the result for better UX
    deleteItem(itemId).catch(error => {
      console.error('Failed to delete item:', error);
      // Optionally show a toast notification here
    });
  };

  // Loading state
  if (loading && items.length === 0 || categoriesLoading || unitsLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white text-lg">Lade Einkaufsliste...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-400 text-lg">Fehler beim Laden: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header entfernt, global! */}
      {/* Info-Box */}
      <div className="bg-neutral-900 flex items-center gap-3 px-4 py-3 mt-2 mb-2">
        <FontAwesomeIcon icon="fa-sun-haze" className="text-yellow-400" size="2xl"/>
        <span className="text-gray-200 text-sm flex-1">HNGRY wird ab dem 31. März 2025 nicht mehr verfügbar sein. <a href="#" className="underline text-gray-300">Mehr erfahren</a></span>
      </div>

      {/* Kategorien & Produkte */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="divide-y divide-neutral-800">
          {/* Render items grouped by category */}
          {Object.entries(groupedIncompleteItems).map(([categoryName, categoryData]) => (
            <div key={categoryName}>
              <div className="px-4 pt-4 pb-1 text-gray-300 text-sm">{categoryName}</div>
              {categoryData.items.map((item) => (
                <SwipeAction
                  key={item.id}
                  onDelete={() => handleDeleteItem(item.id)}
                  className="border-b border-neutral-800"
                >
                  <div className="flex items-center bg-neutral-900">
                    <button
                      className="flex items-center pl-4 py-3 flex-1 text-left"
                      onClick={(e) => handleToggleCompletion(item.id, e)}
                    >
                      {/* Item icon with fixed width container */}
                      <div className="w-8 flex justify-center mr-4">
                        <FontAwesomeIcon 
                          icon={item.icon || 'basket-shopping'} 
                          className="text-gray-300" 
                          size="2xl"
                        />
                      </div>
                      <span className="text-lg text-gray-200">
                        {item.name}
                        {item.notes && (
                          <span className="text-gray-400 text-sm ml-1">{item.notes}</span>
                        )}
                      </span>
                      <span className="flex-1" />
                      {item.quantity && (
                        <span className="text-gray-400 text-base">
                          {item.quantity}{item.unit_id && ` ${getUnitShortNameById(item.unit_id, units)}`}
                        </span>
                      )}
                    </button>
                    <div className="flex items-center">
                      <div className="w-[1px] h-8 bg-neutral-700 mx-2 my-2" />
                      <button
                        className="px-4 py-3 hover:bg-neutral-800"
                        onClick={() => handleItemClick(item.id)}
                      >
                        <FontAwesomeIcon className="text-gray-500" icon="fa-chevron-right" size="base" style="regular"/>
                      </button>
                    </div>
                  </div>
                </SwipeAction>
              ))}
            </div>
          ))}
        </div>

        {/* Gekaufte Produkte */}
        {completed.length > 0 && (
          <div className="mt-6">
            <button
              className="flex items-center px-4 pb-2 w-full select-none focus:outline-none"
              onClick={() => setShowCompleted((v) => !v)}
              type="button"
            >
              <span className="text-gray-300 text-xs font-semibold flex-1 text-left">GEKAUFTE PRODUKTE</span>
              <FontAwesomeIcon
                className={`w-5 h-5 text-gray-300 transition-transform duration-200 ${showCompleted ? '' : 'rotate-180'}`}
                icon="fa-chevron-down"
                size="base"
                style="regular"/>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${showCompleted ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
            >
              <div className="divide-y divide-neutral-800">
                {completed.map((item) => {
                  return (
                    <div key={item.id} className="flex items-center px-4 py-3">
                      {/* Item icon for completed items with fixed width container */}
                      <div className="w-8 flex justify-center mr-4">
                        <FontAwesomeIcon 
                          icon={item.icon || 'basket-shopping'} 
                          className="text-gray-300" 
                          size="2xl"
                        />
                      </div>
                      <span className={`text-lg ${item.is_completed ? 'text-gray-400 line-through' : 'text-gray-200'}`}> {item.name}
                        {item.notes && (
                          <span className="text-gray-400 text-sm ml-1">{item.notes}</span>
                        )}
                      </span>
                      <span className="flex-1" />
                      {item.quantity && (
                        <span className="text-gray-400 text-base">
                          {item.quantity}{item.unit_id && ` ${getUnitShortNameById(item.unit_id, units)}`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 w-full bg-neutral-900 border-t border-neutral-800 flex justify-around items-center h-20 z-20">
        <button className="flex flex-col items-center justify-center flex-1 py-2 text-yellow-400">
          <FontAwesomeIcon icon="fa-square-poll-vertical" size="3xl" style="regular" className="mb-1"/>
          <span className="text-xs font-semibold">Einkaufsliste</span>
        </button>
        <button className="flex flex-col items-center justify-center flex-1 py-2 text-gray-400">
          <FontAwesomeIcon icon="fa-shelves" size="3xl" style="regular" className="mb-1"/>
          <span className="text-xs font-semibold">Vorrat</span>
        </button>
      </div>

      {/* Bottom Sheet Sortiermenü */}
      {sortSheetOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setSortSheetOpen(false)}
          />
          {/* Bottom Sheet */}
          <div className="fixed left-0 right-0 bottom-0 z-50">
            <div className="mx-auto max-w-md rounded-t-3xl bg-neutral-900 p-6 pb-8 shadow-2xl border-t border-neutral-800 relative">
              <div className="w-12 h-1.5 bg-neutral-700 rounded-full mx-auto mb-4" onClick={() => setSortSheetOpen(false)} />
              <div className="text-center text-gray-400 text-sm mb-6">Liste sortieren</div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between text-yellow-400 font-semibold text-lg">
                  <div className="flex items-center">
                    <FontAwesomeIcon icon="fa-list" size="base" style="regular" className="mr-3"/>
                    Nach Kategorie
                  </div>
                  <FontAwesomeIcon icon="fa-pen-circle" size="base" className="text-yellow-400"/>
                </div>
                <div className="flex items-center text-gray-300 text-base">
                  <FontAwesomeIcon icon="fa-arrow-down-9-1" size="base" style="regular" className="mr-3"/>
                  Letztes Produkt oben
                </div>
                <div className="flex items-center text-gray-300 text-base">
                  <FontAwesomeIcon icon="fa-arrow-down-1-9" size="base" style="regular" className="mr-3"/>
                  Letztes Produkt unten
                </div>
                <div className="flex items-center text-gray-300 text-base">
                  <FontAwesomeIcon icon="fa-arrow-down-a-z" size="base" style="regular" className="mr-3"/>
                  Alphabetisch
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ShoppingListPage; 