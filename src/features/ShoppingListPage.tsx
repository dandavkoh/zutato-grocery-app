import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setHeader, resetHeader, resetFilterClick, setSelectedItem, setCurrentList } from '../stores/store';
import type { RootState } from '../stores/store';
import { useShoppingItemsDexie } from '../hooks/useShoppingItemsDexie';
import { useListDexie } from '../hooks/useListsDexie';
import { useCategoriesDexie } from '../hooks/useCategoriesDexie';
import { useUnitsDexie } from '../hooks/useUnitsDexie';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { groupItemsByCategory, separateCompletedItems, getUnitShortNameById } from '../api/supabaseApi';
import type { ShoppingItem } from '../api/supabaseApi';
import { sortItems, SortModes } from '../utils/sortUtils';
import SwipeAction from '../components/SwipeAction';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import { useToast } from '../contexts/ToastContext';

const ShoppingListPage: React.FC = () => {
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const [openSortMode, setOpenSortMode] = useState<'category' | 'last_top' | 'last_bottom' | 'alpha'>('category');
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

  // Set up realtime sync for this list
  const { isConnected } = useRealtimeSync(listId, () => {
    // Force a refresh of the shopping items when we receive an update
    // The useShoppingItemsDexie hook will automatically reload from Supabase
    console.log('Realtime update received, triggering refresh');
  });
  
  // Group items by category and separate completed items
  const { completed, incomplete } = separateCompletedItems(items as any);
  // Newest first = descending by Edited
  const sortedCompleted = sortItems<ShoppingItem>(SortModes.Edited, false, completed as ShoppingItem[]);

  // Open items sorting/grouping
  let groupedIncompleteItems: ReturnType<typeof groupItemsByCategory> | null = null;
  let flatSortedIncompleteItems: ShoppingItem[] | null = null;

  if (openSortMode === 'category') {
    const grouped = groupItemsByCategory(incomplete as any, categories);
    // Sort items within each category alphabetically ascending
    const entries = Object.entries(grouped).map(([categoryName, categoryData]) => {
      const sortedItems = sortItems<ShoppingItem>(SortModes.Alphabetical, true, categoryData.items as any);
      return [categoryName, { ...categoryData, items: sortedItems }] as const;
    });
    // Order groups by category.sort_order ascending; "Keine Kategorie" always on top
    const sortedEntries = entries.sort((a, b) => {
      const aCat = a[1].category;
      const bCat = b[1].category;
      const aIsNone = aCat.id === 'none' || a[0] === 'Keine Kategorie';
      const bIsNone = bCat.id === 'none' || b[0] === 'Keine Kategorie';
      if (aIsNone && !bIsNone) return -1;
      if (!aIsNone && bIsNone) return 1;
      const aOrder = (aCat as any).sort_order ?? 0;
      const bOrder = (bCat as any).sort_order ?? 0;
      return aOrder - bOrder;
    });
    groupedIncompleteItems = Object.fromEntries(sortedEntries);
  } else {
    // Flat sorting without grouping
    if (openSortMode === 'last_top') {
      flatSortedIncompleteItems = sortItems<ShoppingItem>(SortModes.Edited, false, incomplete as any);
    } else if (openSortMode === 'last_bottom') {
      flatSortedIncompleteItems = sortItems<ShoppingItem>(SortModes.Edited, true, incomplete as any);
    } else {
      // 'alpha'
      flatSortedIncompleteItems = sortItems<ShoppingItem>(SortModes.Alphabetical, true, incomplete as any);
    }
  }
  const { showToast } = useToast();

  // Watch for filter click events
  const filterClicked = useSelector((state: RootState) => state.events.filterClicked);

  useEffect(() => {
    dispatch(setHeader({
      title: list?.name || 'Lade...',
      showBack: false,
      background: '',
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
      navigate(`/shopping-list/${listId}/product/${itemId}`, { 
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
      setItemCompletion(itemId, newCompletionStatus)
        .then(() => {
          showToast(`${currentItem.name} ${newCompletionStatus ? 'erledigt' : 'unerledigt'}`, { type: 'success' });
        })
        .catch((error: any) => {
        console.error('Failed to set item completion:', error);
          showToast('Fehler beim Aktualisieren des Status', { type: 'error' });
        });
      // Clean up the timeout reference
      delete toggleDebounceRef.current[itemId];
    }, 100); // 100ms debounce
  }, [setItemCompletion, items]);

  const handleDeleteItem = (itemId: string) => {
    // Fire and forget - don't await the result for better UX
    const item = items.find(i => i.id === itemId);
    deleteItem(itemId)
      .then(() => {
        if (item) {
          showToast(`${item.name} gelöscht`, { type: 'success' });
        } else {
          showToast('Produkt gelöscht', { type: 'success' });
        }
      })
      .catch(error => {
        console.error('Failed to delete item:', error);
        showToast('Fehler beim Löschen', { type: 'error' });
      });
  };

  // Loading state
  if (loading && items.length === 0 || categoriesLoading || unitsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-700 text-lg">Lade Einkaufsliste...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-600 text-lg">Fehler beim Laden: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Info-Box */}
      <div className="bg-white border border-gray-200 shadow-sm flex items-center gap-3 px-4 py-3 mt-2 mb-2">
        <FontAwesomeIcon icon="bell" className="text-orange-600" size="2xl"/>
        <span className="text-gray-900 text-sm flex-1">ZUTATO - Testversion</span>
      </div>

      {/* Kategorien & Produkte */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="divide-y divide-gray-200">
          {openSortMode === 'category' && groupedIncompleteItems && (
            Object.entries(groupedIncompleteItems).map(([categoryName, categoryData]) => (
              <div key={categoryName}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-1 text-gray-700 text-sm">{categoryName}</div>
                {categoryData.items.map((item) => (
                  <div key={item.id} className="bg-white">
                    <SwipeAction
                      onDelete={() => handleDeleteItem(item.id)}
                      className="border-b border-gray-200"
                    >
                      <div className="flex items-center">
                        <button
                          className="flex items-center pl-4 py-3 flex-1 text-left hover:bg-orange-50 transition-colors"
                          onClick={(e) => handleToggleCompletion(item.id, e)}
                        >
                          <div className="w-8 flex justify-center mr-4">
                            <FontAwesomeIcon 
                              icon={item.icon || 'basket-shopping'} 
                              className="text-gray-600" 
                              size="2xl"
                            />
                          </div>
                          <span className="text-lg text-gray-900">
                            {item.name}
                            {item.notes && (
                              <span className="text-gray-600 text-sm ml-1">{item.notes}</span>
                            )}
                          </span>
                          <span className="flex-1" />
                          {item.quantity && (
                            <span className="text-gray-600 text-base">
                              {item.quantity}{item.unit_id && ` ${getUnitShortNameById(item.unit_id, units)}`}
                            </span>
                          )}
                        </button>
                        <div className="flex items-center">
                          <div className="w-[1px] h-8 bg-gray-200 mx-2 my-2" />
                          <button
                            className="px-4 py-3 hover:bg-orange-50 rounded-md"
                            onClick={() => handleItemClick(item.id)}
                          >
                            <FontAwesomeIcon className="text-gray-500" icon="fa-chevron-right" size="base" style="regular"/>
                          </button>
                        </div>
                      </div>
                    </SwipeAction>
                  </div>
                ))}
              </div>
            ))
          )}

          {openSortMode !== 'category' && flatSortedIncompleteItems && (
            flatSortedIncompleteItems.map((item) => (
              <div key={item.id} className="bg-white">
                <SwipeAction
                  onDelete={() => handleDeleteItem(item.id)}
                  className="border-b border-gray-200"
                >
                  <div className="flex items-center">
                    <button
                      className="flex items-center pl-4 py-3 flex-1 text-left hover:bg-orange-50 transition-colors"
                      onClick={(e) => handleToggleCompletion(item.id, e)}
                    >
                      <div className="w-8 flex justify-center mr-4">
                        <FontAwesomeIcon 
                          icon={item.icon || 'basket-shopping'} 
                          className="text-gray-600" 
                          size="2xl"
                        />
                      </div>
                      <span className="text-lg text-gray-900">
                        {item.name}
                        {item.notes && (
                          <span className="text-gray-600 text-sm ml-1">{item.notes}</span>
                        )}
                      </span>
                      <span className="flex-1" />
                      {item.quantity && (
                        <span className="text-gray-600 text-base">
                          {item.quantity}{item.unit_id && ` ${getUnitShortNameById(item.unit_id, units)}`}
                        </span>
                      )}
                    </button>
                    <div className="flex items-center">
                      <div className="w-[1px] h-8 bg-gray-200 mx-2 my-2" />
                      <button
                        className="px-4 py-3 hover:bg-orange-50 rounded-md"
                        onClick={() => handleItemClick(item.id)}
                      >
                        <FontAwesomeIcon className="text-gray-500" icon="fa-chevron-right" size="base" style="regular"/>
                      </button>
                    </div>
                  </div>
                </SwipeAction>
              </div>
            ))
          )}
        </div>

        {completed.length > 0 && (
          <div className="mt-6">
            <button
              className="flex items-center px-4 pb-2 w-full select-none focus:outline-none"
              onClick={() => setShowCompleted((v) => !v)}
              type="button"
            >
              <span className="text-gray-700 text-xs font-semibold flex-1 text-left">Gekaufte Produkte</span>
              <FontAwesomeIcon
                className={`w-5 h-5 text-gray-700 transition-transform duration-200 ${showCompleted ? '' : 'rotate-180'}`}
                icon="fa-chevron-down"
                size="base"
                style="regular"/>
              </button>
              <div
                className={`transition-all duration-300 ${showCompleted ? 'opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
              >
                <div className="divide-y divide-gray-200">
                  {sortedCompleted.map((item) => {
                    return (
                      <button
                        key={item.id}
                        className="flex items-center px-4 py-3 bg-white w-full text-left hover:bg-orange-50"
                        onClick={(e) => handleToggleCompletion(item.id, e)}
                        type="button"
                      >
                        <div className="w-8 flex justify-center mr-4">
                          <FontAwesomeIcon 
                            icon={item.icon || 'basket-shopping'} 
                            className="text-gray-600" 
                            size="2xl"
                          />
                        </div>
                        <span className={`text-lg ${item.is_completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}> {item.name}
                          {item.notes && (
                            <span className="text-gray-600 text-sm ml-1">{item.notes}</span>
                          )}
                        </span>
                        <span className="flex-1" />
                        {item.quantity && (
                          <span className="text-gray-600 text-base">
                            {item.quantity}{item.unit_id && ` ${getUnitShortNameById(item.unit_id, units)}`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-20 z-20">
        <button className="flex flex-col items-center justify-center flex-1 py-2 text-orange-600">
          <FontAwesomeIcon icon="fa-square-poll-vertical" size="3xl" style="regular" className="mb-1"/>
          <span className="text-xs font-semibold">Einkaufsliste</span>
        </button>
        <button className="flex flex-col items-center justify-center flex-1 py-2 text-gray-600" onClick={() => showToast('Kommt in einer zukünftigen Version', { type: 'info' })}>
          <FontAwesomeIcon icon="fa-book" size="3xl" style="regular" className="mb-1"/>
          <span className="text-xs font-semibold">Kochbuch</span>
        </button>
      </div>

      {/* Bottom Sheet Sortiermenü */}
      {sortSheetOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setSortSheetOpen(false)}
          />
          <div className="fixed left-0 right-0 bottom-0 z-50">
            <div className="mx-auto max-w-md rounded-t-3xl bg-white p-6 pb-8 shadow-2xl border-t border-gray-200 relative">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" onClick={() => setSortSheetOpen(false)} />
              <div className="text-center text-gray-700 text-sm mb-6">Liste sortieren</div>
              <div className="flex flex-col gap-2">
                <button
                  className={`flex items-center justify-between rounded-lg px-3 py-2 border ${openSortMode === 'category' ? 'border-orange-600 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-900'}`}
                  onClick={() => { setOpenSortMode('category'); setSortSheetOpen(false); }}
                  type="button"
                >
                  <div className="flex items-center">
                    <FontAwesomeIcon icon="fa-list" size="base" style="regular" className="mr-3"/>
                    Nach Kategorie (A→Z)
                  </div>
                  {openSortMode === 'category' && <FontAwesomeIcon icon="fa-check" className="text-orange-600"/>}
                </button>
                <button
                  className={`flex items-center justify-between rounded-lg px-3 py-2 border ${openSortMode === 'last_top' ? 'border-orange-600 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-900'}`}
                  onClick={() => { setOpenSortMode('last_top'); setSortSheetOpen(false); }}
                  type="button"
                >
                  <div className="flex items-center">
                    <FontAwesomeIcon icon="fa-arrow-down-9-1" size="base" style="regular" className="mr-3"/>
                    Letztes Produkt oben
                  </div>
                  {openSortMode === 'last_top' && <FontAwesomeIcon icon="fa-check" className="text-orange-600"/>}
                </button>
                <button
                  className={`flex items-center justify-between rounded-lg px-3 py-2 border ${openSortMode === 'last_bottom' ? 'border-orange-600 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-900'}`}
                  onClick={() => { setOpenSortMode('last_bottom'); setSortSheetOpen(false); }}
                  type="button"
                >
                  <div className="flex items-center">
                    <FontAwesomeIcon icon="fa-arrow-down-1-9" size="base" style="regular" className="mr-3"/>
                    Letztes Produkt unten
                  </div>
                  {openSortMode === 'last_bottom' && <FontAwesomeIcon icon="fa-check" className="text-orange-600"/>}
                </button>
                <button
                  className={`flex items-center justify-between rounded-lg px-3 py-2 border ${openSortMode === 'alpha' ? 'border-orange-600 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-900'}`}
                  onClick={() => { setOpenSortMode('alpha'); setSortSheetOpen(false); }}
                  type="button"
                >
                  <div className="flex items-center">
                    <FontAwesomeIcon icon="fa-arrow-down-a-z" size="base" style="regular" className="mr-3"/>
                    Alphabetisch (A→Z)
                  </div>
                  {openSortMode === 'alpha' && <FontAwesomeIcon icon="fa-check" className="text-orange-600"/>}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ShoppingListPage; 