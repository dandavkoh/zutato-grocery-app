import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setHeader, resetHeader } from '../stores/store';
import type { RootState } from '../stores/store';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import { useProductSearch } from '../hooks/useProductSearch';
import { useProductInList } from '../hooks/useProductInList';
import { useProductActions } from '../hooks/useProductActions';
import type { ProductOrGroup } from '../api/supabaseApi';
import { useToast } from '../contexts/ToastContext';
import { isIOS, releaseKeyboardPrimer } from '../utils/iosKeyboard';
import { environment } from '../config/environment';

const MAX_ACTIVE_ITEMS = environment.shoppingListMaxActiveItems;

const recommendations = [
  { icon: <FontAwesomeIcon icon="sack" className="text-gray-300" size="2xl"/>, name: 'Zucker', sub: 'Brauner' },
  { icon: <FontAwesomeIcon icon="bread-slice" className="text-gray-300" size="2xl"/>, name: 'Toast' },
  { icon: <FontAwesomeIcon icon="bowl-spoon" className="text-gray-300" size="2xl"/>, name: 'Brei' },
  { icon: <FontAwesomeIcon icon="cheese-swiss" className="text-gray-300" size="2xl"/>, name: 'Gouda' },
  { icon: <FontAwesomeIcon icon="glass-citrus" className="text-gray-300" size="2xl"/>, name: 'Zitronensaft' },
  { icon: <FontAwesomeIcon icon="pepper" className="text-gray-300" size="2xl"/>, name: 'Paprika' },
  { icon: <FontAwesomeIcon icon="tomato" className="text-gray-300" size="2xl"/>, name: 'Tomaten', sub: 'Gehackte' },
  { icon: <FontAwesomeIcon icon="leaf" className="text-gray-300" size="2xl"/>, name: 'Rucola' },
];
const seasonal = [
  { icon: <FontAwesomeIcon icon="mushroom" className="text-gray-300" size="2xl"/>, name: 'Champignons' },
  { icon: <FontAwesomeIcon icon="salad" className="text-gray-300" size="2xl"/>, name: 'Chicorée' },
  { icon: <FontAwesomeIcon icon="carrot" className="text-gray-300" size="2xl"/>, name: 'Rote Bete' },
  { icon: <FontAwesomeIcon icon="leafy-green" className="text-gray-300" size="2xl"/>, name: 'Weißkohl' },
];

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
  const { showToast } = useToast();

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
                        <span className="text-gray-500 text-sm ml-2">
                          ({item.src === 'exact' ? 'Exakter Vorschlag' : item.src === 'fts' ? 'Exakte Suche' : 'Ähnliche Suche'})
                        </span>
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
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 mb-4">
            <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col relative overflow-hidden">
              <div className="text-lg text-gray-900 font-semibold mb-1">Rezepte importieren</div>
              <div className="text-gray-600 text-sm mb-4">Füge die Zutaten aus deinen online Lieblingsrezepten ganz einfach per Link hinzu.</div>
              <button className="bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-full px-5 py-2 text-base w-fit">Dein Rezept hinzufügen</button>
              <div className="absolute right-4 bottom-2 opacity-20 text-gray-400">
                <svg width="100" height="60" viewBox="0 0 100 60" fill="none"><rect x="60" y="30" width="30" height="20" rx="4" stroke="currentColor" strokeWidth="2"/><rect x="10" y="10" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="2"/><rect x="40" y="10" width="15" height="15" rx="3" stroke="currentColor" strokeWidth="2"/><rect x="80" y="10" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="10" y="40" width="15" height="15" rx="3" stroke="currentColor" strokeWidth="2"/><rect x="30" y="40" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="50" y="40" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="70" y="40" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="90" y="40" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="2"/><rect x="40" y="30" width="15" height="15" rx="3" stroke="currentColor" strokeWidth="2"/><rect x="20" y="30" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="60" y="10" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="80" y="30" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="90" y="10" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="2"/></svg>
              </div>
            </div>
          </div>

          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 mb-2">
            <div className="text-xs text-gray-500 font-semibold mb-1">Für dich empfohlen</div>
            <div className="text-gray-600 text-xs mb-3">Aufgrund deiner Aktivitäten gehen wir davon aus, dass du diese Artikel bald benötigen wirst.</div>
            <div className="grid grid-cols-2 gap-3">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex items-center bg-white rounded-xl px-4 py-3 border border-gray-200 shadow-sm">
                  <span className="mr-3 text-gray-600">{rec.icon}</span>
                  <span className="text-base text-gray-900 flex-1">{rec.name} {rec.sub && <span className='text-gray-600 text-sm'>{rec.sub}</span>}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 pb-24">
            <div className="text-xs text-gray-500 font-semibold mb-1">Saisonale Produkte</div>
            <div className="text-gray-600 text-xs mb-3">Aktuell sind diese Produkte in Saison.</div>
            <div className="grid grid-cols-2 gap-3">
              {seasonal.map((item, i) => (
                <div key={i} className="flex items-center bg-white rounded-xl px-4 py-3 border border-gray-200 shadow-sm">
                  <span className="mr-3 text-gray-600">{item.icon}</span>
                  <span className="text-base text-gray-900 flex-1">{item.name}</span>
                </div>
              ))}
            </div>
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