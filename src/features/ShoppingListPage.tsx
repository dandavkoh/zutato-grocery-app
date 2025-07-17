import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setHeader, resetHeader, resetFilterClick } from '../stores/store';
import type { RootState } from '../stores/store';
import { useShoppingItemsRTK } from '../hooks/useShoppingItemsRTK';
import { groupItemsByCategory, separateCompletedItems } from '../api/mockApi';
import SwipeAction from '../components/SwipeAction';
import FontAwesomeIcon from '../components/FontAwesomeIcon';

const ShoppingListPage: React.FC = () => {
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const dispatch = useDispatch();
  
  // Use the RTK Query shopping items hook
  const { items, loading, error, toggleItemCompletion, deleteItem } = useShoppingItemsRTK('household-1');
  
  // Group items by category and separate completed items
  const { completed, incomplete } = separateCompletedItems(items);
  const groupedIncompleteItems = groupItemsByCategory(incomplete);

  // Watch for filter click events
  const filterClicked = useSelector((state: RootState) => state.events.filterClicked);

  useEffect(() => {
    dispatch(setHeader({
      title: 'Wocheneinkauf',
      showBack: false,
      background: 'bg-yellow-400',
      showSearchBar: true,
      showFilterIcon: true,
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch]);

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
      navigate('/product', { 
        state: { item } 
      });
    }
  };

  // Debounce function to prevent rapid clicks
  const toggleDebounceRef = useRef<{ [key: string]: number }>({});

  const handleToggleCompletion = useCallback((itemId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    
    // Clear existing timeout for this item
    if (toggleDebounceRef.current[itemId]) {
      clearTimeout(toggleDebounceRef.current[itemId]);
    }
    
    // Set a new timeout to prevent rapid clicks
    toggleDebounceRef.current[itemId] = setTimeout(() => {
      // Fire and forget - don't await the result for better UX
      toggleItemCompletion(itemId).catch(error => {
        console.error('Failed to toggle item completion:', error);
        // Optionally show a toast notification here
      });
      // Clean up the timeout reference
      delete toggleDebounceRef.current[itemId];
    }, 100); // 100ms debounce
  }, [toggleItemCompletion]);

  const handleDeleteItem = (itemId: string) => {
    // Fire and forget - don't await the result for better UX
    deleteItem(itemId).catch(error => {
      console.error('Failed to delete item:', error);
      // Optionally show a toast notification here
    });
  };

  // Loading state
  if (loading && items.length === 0) {
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
          {Object.entries(groupedIncompleteItems).map(([category, categoryItems]) => (
            <div key={category}>
              <div className="px-4 pt-4 pb-1 text-gray-300 text-sm">{category}</div>
              {categoryItems.map((item) => (
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
                      {/* Font Awesome icon from API with fixed width container */}
                      <div className="w-8 flex justify-center mr-4">
                        {item.icon ? (
                          <FontAwesomeIcon 
                            icon={item.icon} 
                            className="text-gray-300" 
                            size="2xl"
                          />
                        ) : (
                          // Fallback icon if no icon is specified
                          <FontAwesomeIcon 
                            icon="fa-cart-shopping" 
                            className="text-gray-300" 
                            size="2xl"
                          />
                        )}
                      </div>
                      <span className="text-lg text-gray-200">
                        {item.name}
                        {item.description && (
                          <span className="text-gray-400 text-sm ml-1">{item.description}</span>
                        )}
                      </span>
                      <span className="flex-1" />
                      {item.amount && item.unit && (
                        <span className="text-gray-400 text-base">
                          {item.amount} {item.unit.short}
                        </span>
                      )}
                    </button>
                    <div className="flex items-center">
                      <div className="w-[1px] h-8 bg-neutral-700 mx-2 my-2" />
                      <button
                        className="px-4 py-3 hover:bg-neutral-800"
                        onClick={() => handleItemClick(item.id)}
                      >
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
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
              <svg
                className={`w-5 h-5 text-gray-300 transition-transform duration-200 ${showCompleted ? '' : 'rotate-180'}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${showCompleted ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
            >
              <div className="divide-y divide-neutral-800">
                {completed.map((item) => (
                  <div key={item.id} className="flex items-center px-4 py-3">
                    {/* Font Awesome icon from API for completed items with fixed width container */}
                    <div className="w-8 flex justify-center mr-4">
                      {item.icon ? (
                        <FontAwesomeIcon 
                          icon={item.icon} 
                          className="text-gray-300" 
                          size="2xl"
                        />
                      ) : (
                        // Fallback icon if no icon is specified
                        <FontAwesomeIcon 
                          icon="fa-cart-shopping" 
                          className="text-gray-300" 
                          size="2xl"
                        />
                      )}
                    </div>
                    <span className={`text-lg ${item.isCompleted ? 'text-gray-400 line-through' : 'text-gray-200'}`}> {item.name}
                      {item.description && (
                        <span className="text-gray-400 text-sm ml-1">{item.description}</span>
                      )}
                    </span>
                    <span className="flex-1" />
                    {item.amount && item.unit && (
                      <span className="text-gray-400 text-base">
                        {item.amount} {item.unit.short}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 w-full bg-neutral-900 border-t border-neutral-800 flex justify-around items-center h-20 z-20">
        <button className="flex flex-col items-center justify-center flex-1 py-2 text-yellow-400">
          <FontAwesomeIcon icon="fa-square-poll-vertical" size="3xl" style="regular"/>
          <span className="text-xs font-semibold">Einkaufsliste</span>
        </button>
        <button className="flex flex-col items-center justify-center flex-1 py-2 text-gray-400">
          <FontAwesomeIcon icon="fa-shelves" size="3xl" style="regular"/>
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
                <div className="flex items-center text-yellow-400 font-semibold text-lg">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" /></svg>
                  Nach Kategorie
                </div>
                <div className="flex items-center text-gray-300 text-base">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7v10m8-10v10M4 17h16" /></svg>
                  Letztes Produkt oben
                </div>
                <div className="flex items-center text-gray-300 text-base">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 17V7m8 10V7M4 7h16" /></svg>
                  Letztes Produkt unten
                </div>
                <div className="flex items-center text-gray-300 text-base">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /><text x="17" y="21" fontSize="10" fill="currentColor">A</text></svg>
                  Alphabetisch
                </div>
              </div>
              <button className="absolute right-6 top-6 bg-yellow-400 rounded-full p-2 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13h6m2 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ShoppingListPage; 