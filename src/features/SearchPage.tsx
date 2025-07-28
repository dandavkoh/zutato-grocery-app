import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setHeader, resetHeader } from '../stores/store';
import type { RootState } from '../stores/store';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import { useProductSearch } from '../hooks/useProductSearch';
import { useProductInList } from '../hooks/useProductInList';
import { useProductActions } from '../hooks/useProductActions';
import type { ProductGroup } from '../api/supabaseApi';

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
  const dispatch = useDispatch();
  const search = useSelector((state: RootState) => state.search.value);
  
  // Use the product search hook
  const { searchResults, loading, error, searchProducts, clearSearch } = useProductSearch(300);
  
  // Use the product in list hook to check if products are already in the current list
  const { isProductInList, refreshItems } = useProductInList();
  
  // Use the product actions hook to handle product clicks
  const { handleProductAction, currentListId, user } = useProductActions(refreshItems);

  useEffect(() => {
    dispatch(setHeader({
      title: '',
      showBack: false,
      background: 'bg-yellow-400',
      showSearchBar: true, // NEU: Suchleiste im Header anzeigen
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch, navigate]);

  // Trigger search when search value changes
  useEffect(() => {
    if (search) {
      searchProducts(search);
    } else {
      clearSearch();
    }
  }, [search]); // Remove searchProducts and clearSearch from dependencies

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
  const exactSuggestion: ProductGroup = {
    id: 'exact-suggestion',
    title: search,
    rank: 1.0,
    src: 'exact',
    default_icon: 'basket-shopping',
    default_category_id: ''
  };

  // Combine exact suggestion with search results
  const displayResults = shouldShowExactSuggestion 
    ? [exactSuggestion, ...searchResults]
    : searchResults;

  // Handle product button click
  const handleProductClick = async (product: any) => {
    if (!currentListId || !user) {
      console.error('No current list or user found');
      return;
    }
    
    await handleProductAction(product);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header entfernt, global! */}
      {showResults ? (
        <div className="w-full pb-8 pt-2">
          <div className="px-4 pt-2 pb-1 flex items-center gap-2 text-gray-300 text-base font-semibold">
           <FontAwesomeIcon icon="fa-clipboard-list-check" size="base" style="regular"/>
            Einkaufsvorschläge
          </div>
          
          {loading && (
            <div className="px-4 py-3 text-gray-400 text-center">
              Suche läuft...
            </div>
          )}
          
          {error && (
            <div className="px-4 py-3 text-red-400 text-center">
              Fehler: {error}
            </div>
          )}
          
          {!loading && !error && displayResults.length === 0 && search.length >= 3 && (
            <div className="px-4 py-3 text-gray-400 text-center">
              Keine Ergebnisse gefunden
            </div>
          )}
          
          <div className="divide-y divide-neutral-800">
            {displayResults.map((item) => {
              const isInList = isProductInList(item.title);
              
              return (
                <div key={item.id} className="flex items-center px-4 py-3 bg-neutral-900">
                  <span className="mr-4 text-gray-300">
                    <FontAwesomeIcon icon={item.default_icon} size="2xl" style="regular"/>
                  </span>
                  <span className="text-base text-gray-200 flex-1">
                    {item.title}
                    <span className="text-gray-400 text-sm ml-2">
                      ({item.src === 'exact' ? 'Exakter Vorschlag' : item.src === 'fts' ? 'Exakte Suche' : 'Ähnliche Suche'})
                    </span>
                  </span>
                  <button 
                    onClick={() => handleProductClick(item)}
                    className="rounded-full border-2 border-yellow-400 text-yellow-400 w-8 h-8 flex items-center justify-center ml-2 hover:bg-yellow-400 hover:text-black transition-colors"
                  >
                    <FontAwesomeIcon 
                      icon={isInList ? "fa-pen-circle" : "fa-circle-plus"} 
                      size="2xl" 
                      style="regular"
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Importieren-Box */}
          <div className="mx-4 mt-6 mb-4 p-4 rounded-2xl border border-gray-600 bg-neutral-900 flex flex-col relative overflow-hidden">
            <div className="text-lg text-gray-200 font-semibold mb-1">Rezepte importieren</div>
            <div className="text-gray-400 text-sm mb-4">Füge die Zutaten aus deinen online Lieblingsrezepten ganz einfach per Link hinzu.</div>
            <button className="bg-yellow-400 text-white font-semibold rounded-full px-5 py-2 text-base w-fit">Dein Rezept hinzufügen</button>
            <div className="absolute right-4 bottom-2 opacity-30">
              <svg width="100" height="60" viewBox="0 0 100 60" fill="none"><rect x="60" y="30" width="30" height="20" rx="4" stroke="white" strokeWidth="2"/><rect x="10" y="10" width="20" height="20" rx="4" stroke="white" strokeWidth="2"/><rect x="40" y="10" width="15" height="15" rx="3" stroke="white" strokeWidth="2"/><rect x="80" y="10" width="10" height="10" rx="2" stroke="white" strokeWidth="2"/><rect x="10" y="40" width="15" height="15" rx="3" stroke="white" strokeWidth="2"/><rect x="30" y="40" width="10" height="10" rx="2" stroke="white" strokeWidth="2"/><rect x="50" y="40" width="10" height="10" rx="2" stroke="white" strokeWidth="2"/><rect x="70" y="40" width="10" height="10" rx="2" stroke="white" strokeWidth="2"/><rect x="90" y="40" width="5" height="5" rx="1" stroke="white" strokeWidth="2"/><rect x="40" y="30" width="15" height="15" rx="3" stroke="white" strokeWidth="2"/><rect x="20" y="30" width="10" height="10" rx="2" stroke="white" strokeWidth="2"/><rect x="60" y="10" width="10" height="10" rx="2" stroke="white" strokeWidth="2"/><rect x="80" y="30" width="10" height="10" rx="2" stroke="white" strokeWidth="2"/><rect x="90" y="10" width="5" height="5" rx="1" stroke="white" strokeWidth="2"/></svg>
            </div>
          </div>

          {/* Empfehlungen */}
          <div className="px-4 mb-2">
            <div className="text-xs text-gray-400 font-semibold mb-1">FÜR DICH EMPFOHLEN</div>
            <div className="text-gray-400 text-xs mb-3">Aufgrund deiner Aktivitäten gehen wir davon aus, dass du diese Artikel bald benötigen wirst.</div>
            <div className="grid grid-cols-2 gap-3">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex items-center bg-neutral-900 rounded-xl px-4 py-3 border border-neutral-800">
                  <span className="mr-3 text-gray-300">{rec.icon}</span>
                  <span className="text-base text-gray-200 flex-1">{rec.name} {rec.sub && <span className='text-gray-400 text-sm'>{rec.sub}</span>}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Saisonale Produkte */}
          <div className="px-4 mt-4">
            <div className="text-xs text-gray-400 font-semibold mb-1">SAISONALE PRODUKTE</div>
            <div className="text-gray-400 text-xs mb-3">Aktuell sind diese Produkte in Saison.</div>
            <div className="grid grid-cols-2 gap-3">
              {seasonal.map((item, i) => (
                <div key={i} className="flex items-center bg-neutral-900 rounded-xl px-4 py-3 border border-neutral-800">
                  <span className="mr-3 text-gray-300">{item.icon}</span>
                  <span className="text-base text-gray-200 flex-1">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

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
    </div>
  );
};

export default SearchPage; 