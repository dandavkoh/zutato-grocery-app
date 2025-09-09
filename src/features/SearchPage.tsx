import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setHeader, resetHeader } from '../stores/store';
import type { RootState } from '../stores/store';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import { useProductSearch } from '../hooks/useProductSearch';
import { useProductInList } from '../hooks/useProductInList';
import { useProductActions } from '../hooks/useProductActions';
import { useShoppingItemsDexie } from '../hooks/useShoppingItemsDexie';
import { useCategoriesDexie } from '../hooks/useCategoriesDexie';
import type { ProductOrGroup } from '../api/supabaseApi';
import { useToast } from '../contexts/ToastContext';
import { isIOS, releaseKeyboardPrimer } from '../utils/iosKeyboard';
import { environment } from '../config/environment';

const MAX_ACTIVE_ITEMS = environment.shoppingListMaxActiveItems;

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { listId } = useParams<{ listId: string }>();
  const dispatch = useDispatch();
  const search = useSelector((state: RootState) => state.search.value);
  
  // Use the product search hook
  const { searchResults, loading, error, searchProducts, clearSearch } = useProductSearch(300);
  
  // Use the product in list hook to check if products are already in the current list
  const { isProductInList, items } = useProductInList();
  
  // Use the product actions hook to handle product clicks
  const { handleProductAction, currentListId, user } = useProductActions();
  
  // Use shopping items hook to get completed items for recommendations
  const { items: allItems } = useShoppingItemsDexie(listId || '');
  
  // Use categories hook to get category names
  const { categories } = useCategoriesDexie();
  
  const { showToast } = useToast();

  // Get the last 20 completed products for recommendations
  const completedRecommendations = useMemo(() => {
    if (!allItems || !categories || !items) return [];
    
    // Get names of currently active items to filter them out
    const activeItemNames = items
      .filter(item => !item.is_completed && !item.is_deleted)
      .map(item => item.name.toLowerCase().trim());
    
    const completedItems = allItems
      .filter(item => 
        item.is_completed && 
        !item.is_deleted && 
        !activeItemNames.includes(item.name.toLowerCase().trim())
      )
      .sort((a, b) => {
        // Sort by updated_at descending (most recent first)
        const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return dateB - dateA;
      });
    
    // Remove duplicates by name, keeping the most recent one
    const uniqueItems = completedItems.reduce((acc, item) => {
      const existingIndex = acc.findIndex(existing => 
        existing.name.toLowerCase().trim() === item.name.toLowerCase().trim()
      );
      
      if (existingIndex === -1) {
        // New unique item, add it
        acc.push(item);
      } else {
        // Item with same name exists, keep the more recent one
        const existing = acc[existingIndex];
        const existingDate = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
        const currentDate = item.updated_at ? new Date(item.updated_at).getTime() : 0;
        
        if (currentDate > existingDate) {
          acc[existingIndex] = item; // Replace with more recent item
        }
      }
      
      return acc;
    }, [] as typeof completedItems);
    
    return uniqueItems
      .slice(0, 20) // Get last 20 unique items
      .map(item => {
        const category = categories.find(cat => cat.id === item.category_id);
        return {
          id: item.id,
          icon: item.icon || 'basket-shopping',
          name: item.name,
          category: category?.name || 'Keine Kategorie'
        };
      });
  }, [allItems, categories, items]);

  const activeItemsCount = useMemo(() => {
    if (!items) return 0;
    return items.filter((i: any) => !i.is_completed).length;
  }, [items]);
  const isMaxActiveReached = activeItemsCount >= MAX_ACTIVE_ITEMS;

  useEffect(() => {
    dispatch(setHeader({
      title: '',
      showBack: false,
      background: '',
      showSearchBar: true, // NEU: Suchleiste im Header anzeigen
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch, navigate]);

  // On mount of the search page, transfer focus from the primer (if any) to the real input.
  useEffect(() => {
    if (!isIOS()) return;
    // Defer a bit to ensure the header input is in the DOM
    const timeoutId = window.setTimeout(() => {
      const headerInput = document.querySelector('header input');
      if (headerInput instanceof HTMLInputElement) {
        headerInput.focus();
        try {
          headerInput.setSelectionRange(headerInput.value.length, headerInput.value.length);
        } catch {
          // ignore
        }
      }
      releaseKeyboardPrimer();
    }, 50);
    return () => {
      window.clearTimeout(timeoutId);
      releaseKeyboardPrimer();
    };
  }, []);

  // Trigger search when search value changes
  useEffect(() => {
    if (search) {
      searchProducts(search);
    } else {
      clearSearch();
    }
  }, [search]); // Remove searchProducts and clearSearch from dependencies

  // Handle Enter key press from header search input
  useEffect(() => {
    const handleSearchEnter = (event: Event) => {
      const customEvent = event as CustomEvent;
      const searchTerm = customEvent.detail.searchTerm;
      
      // If we have search results, add the first available product
      if (searchResults.length > 0) {
        const firstProduct = searchResults[0];
        handleProductClick(firstProduct).then(() => {
          // After adding the product, select the text in the header input
          setTimeout(() => {
            const headerInput = document.querySelector('header input');
            if (headerInput instanceof HTMLInputElement) {
              headerInput.focus();
              headerInput.select();
            }
          }, 200);
        });
      } else if (searchTerm && searchTerm.length >= 3) {
        // If no results but search term is valid, create exact suggestion and add it
        const exactSuggestion: ProductOrGroup = {
          id: 'exact-suggestion',
          title: searchTerm,
          rank: 1.0,
          src: 'exact',
          icon: 'basket-shopping',
          category_id: ''
        };
        handleProductClick(exactSuggestion).then(() => {
          // After adding the product, select the text in the header input
          setTimeout(() => {
            const headerInput = document.querySelector('header input');
            if (headerInput instanceof HTMLInputElement) {
              headerInput.focus();
              headerInput.select();
            }
          }, 200);
        });
      }
    };

    window.addEventListener('searchEnterPressed', handleSearchEnter);
    
    return () => {
      window.removeEventListener('searchEnterPressed', handleSearchEnter);
    };
  }, [searchResults]); // Re-run when searchResults change

  const showResults = search.length > 0;

  // Check if we should show the exact search term as a suggestion
  const hasExactMatch = searchResults.some(item => 
    item.title.toLowerCase().trim() === search.toLowerCase().trim()
  );
  
  const shouldShowExactSuggestion = !loading && !error && search.length >= 3 && 
    !hasExactMatch &&
    (searchResults.length === 0 || (
      searchResults.filter(item => item.src === 'fts').every(item => item.rank <= 0.08) &&
      searchResults.filter(item => item.src === 'fuzzy').every(item => item.rank <= 0.8)
    ));

  // Create exact suggestion if needed
  const exactSuggestion: ProductOrGroup = {
    id: 'exact-suggestion',
    title: search,
    rank: 1.0,
    src: 'exact',
    icon: 'basket-shopping',
    category_id: ''
  };

  // Combine exact suggestion with search results
  const displayResults = shouldShowExactSuggestion 
    ? [exactSuggestion, ...searchResults]
    : searchResults;

  // Handle product button click
  const handleProductClick = async (product: any) => {
    const alreadyInList = isProductInList(product.title);
    if (isMaxActiveReached && !alreadyInList) {
      // Block adding new items when limit reached; show toast; editing existing items still allowed
      showToast(`Maximal ${MAX_ACTIVE_ITEMS} aktive Produkte erlaubt.`, { type: 'info' });
      return;
    }
    if (!currentListId || !user) {
      console.error('No current list or user found');
      return;
    }
    
    await handleProductAction(product);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Info banner when list is full */}
      {isMaxActiveReached && (
        <div className="w-full">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-lg px-4 py-3 flex items-start gap-3">
              <FontAwesomeIcon icon="fa-circle-info" className="mt-0.5" />
              <div className="text-sm">
                Deine Einkaufsliste ist sehr groß. Es sind maximal {MAX_ACTIVE_ITEMS} aktive Produkte erlaubt. Bitte erledige oder lösche Produkte, bevor du weitere hinzufügst.
              </div>
            </div>
          </div>
        </div>
      )}
      {showResults ? (
        <div className="w-full">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 flex items-center gap-2 text-gray-900 text-base font-semibold">
            <FontAwesomeIcon icon="fa-clipboard-list-check" size="base" style="regular"/>
            Einkaufsvorschläge
          </div>

          {loading && (
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-gray-700 text-center">
              Suche läuft...
            </div>
          )}

          {error && (
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-red-600 text-center">
              Fehler: {error}
            </div>
          )}

          {!loading && !error && displayResults.length === 0 && search.length >= 3 && (
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-gray-500 text-center">
              Keine Ergebnisse gefunden
            </div>
          )}

          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {displayResults.map((item, idx) => {
                const isInList = isProductInList(item.title);
                return (
                  <div key={item.id} className={idx < displayResults.length - 1 ? 'border-b border-gray-200' : ''}>
                    <button
                      type="button"
                      onClick={() => handleProductClick(item)}
                      className="flex items-center px-4 py-3 hover:bg-orange-50 transition-colors w-full text-left"
                    >
                      <span className="mr-4 text-gray-600">
                        <FontAwesomeIcon icon={item.icon} size="2xl" style="regular"/>
                      </span>
                      <span className="text-base text-gray-900 flex-1">
                        {item.title}
                        {/* <span className="text-gray-500 text-sm ml-2">
                          ({item.src === 'exact' ? 'Exakter Vorschlag' : item.src === 'fts' ? 'Exakte Suche' : 'Ähnliche Suche'})
                        </span> */}
                      </span>
                      {(isInList || !isMaxActiveReached) && (
                        <span className="rounded-full border-2 border-orange-600 text-orange-600 w-8 h-8 flex items-center justify-center ml-2">
                          <FontAwesomeIcon 
                            icon={isInList ? 'fa-pen-circle' : 'fa-circle-plus'} 
                            size="2xl" 
                            style="regular"
                          />
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 mb-2">
            {completedRecommendations.length > 0 ? (
              <>
                <div className="text-xs text-gray-500 font-semibold mb-1">Für dich empfohlen</div>
                <div className="text-gray-600 text-xs mb-3">Aufgrund deiner Aktivitäten gehen wir davon aus, dass du diese Artikel bald benötigen wirst.</div>
                <div className="flex flex-wrap gap-3">
                  {completedRecommendations.map((rec, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleProductClick({
                        id: rec.id,
                        title: rec.name,
                        icon: rec.icon,
                        category_id: ''
                      })}
                      className="flex items-center bg-white rounded-xl px-4 py-3 border border-gray-200 shadow-sm hover:bg-orange-50 transition-colors text-left w-[calc(50%-6px)]"
                    >
                      <span className="mr-3 text-gray-600">
                        <FontAwesomeIcon icon={rec.icon} size="2xl" style="regular"/>
                      </span>
                      <span className="text-base text-gray-900 flex-1">{rec.name} {rec.category && <span className='text-gray-600 text-sm'>({rec.category})</span>}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="text-xs text-gray-500 font-semibold mb-1">Willkommen!</div>
                <div className="text-gray-600 text-xs mb-3">Sobald du Produkte von deiner Einkaufsliste abhakst, werden sie hier als Empfehlungen angezeigt.</div>
                <div className="bg-gray-50 rounded-xl px-4 py-6 text-center">
                  <FontAwesomeIcon icon="fa-lightbulb" className="text-gray-300 mb-2" size="3xl" style="regular"/>
                  <div className="text-gray-500 text-sm">Beginne mit deiner ersten Einkaufsliste</div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-20 z-20">
        <button className="flex flex-col items-center justify-center flex-1 py-2 text-orange-600" onClick={() => navigate(`/shopping-list/${listId}`)}>
          <FontAwesomeIcon icon="fa-square-poll-vertical" size="3xl" style="regular" className="mb-1"/>
          <span className="text-xs font-semibold">Einkaufsliste</span>
        </button>
        <button className="flex flex-col items-center justify-center flex-1 py-2 text-gray-600" onClick={() => navigate(`/shopping-list/${listId}/cookbook`)}>
          <FontAwesomeIcon icon="fa-book" size="3xl" style="regular" className="mb-1"/>
          <span className="text-xs font-semibold">Kochbuch</span>
        </button>
      </div>
    </div>
  );
};

export default SearchPage; 