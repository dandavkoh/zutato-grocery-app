import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setHeader } from '../stores/store';
import type { RootState } from '../stores/store';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import { getSiteUrl } from '../config/environment';
import { useCookbookRecipes, type CookbookRecipe, type RecipeIngredient } from '../hooks/useCookbookRecipes';
import { slugify } from '../utils/slugify';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { sentryErrorService } from '../services/sentryErrorService';

interface AddIngredientsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: CookbookRecipe | null;
  onAddToShoppingList: (ingredients: RecipeIngredient[], portions: number) => void;
  isOnline: boolean;
}

const AddIngredientsDialog: React.FC<AddIngredientsDialogProps> = ({
  isOpen,
  onClose,
  recipe,
  onAddToShoppingList,
  isOnline
}) => {
  const [portions, setPortions] = useState(1);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [loading, setLoading] = useState(false);
  const { fetchRecipeIngredients } = useCookbookRecipes();

  useEffect(() => {
    if (recipe && isOpen && isOnline) {
      setPortions(recipe.portions);
      loadRecipeIngredients(recipe.id);
    } else if (!isOnline) {
      setIngredients([]);
    }
  }, [recipe, isOpen, isOnline]);

  const loadRecipeIngredients = async (recipeId: string) => {
    try {
      const recipeIngredients = await fetchRecipeIngredients(recipeId);
      setIngredients(recipeIngredients);
    } catch (error) {
      console.error('Error loading recipe ingredients:', error);
      sentryErrorService.reportApiError(error, {
        url: 'recipe-ingredients-dialog',
        method: 'GET',
      });
      // Fallback to empty data if loading fails
      setIngredients([]);
    }
  };

  const updateQuantities = (newPortions: number) => {
    if (!recipe) return;
    
    const ratio = newPortions / recipe.portions;
    setIngredients(prev => prev.map(ing => ({
      ...ing,
      quantity: Math.round(ing.baseQuantity * ratio * 100) / 100,
      converted_quantity: ing.conversion_factor ? Math.round(ing.baseQuantity * ratio * ing.conversion_factor * 100) / 100 : undefined
    })));
  };

  const handlePortionChange = (newPortions: number) => {
    if (newPortions < 1) return;
    setPortions(newPortions);
    updateQuantities(newPortions);
  };

  const resetToBaseQuantities = () => {
    if (!recipe) return;
    setPortions(recipe.portions);
    setIngredients(prev => prev.map(ing => ({
      ...ing,
      quantity: ing.baseQuantity,
      converted_quantity: ing.conversion_factor ? ing.baseQuantity * ing.conversion_factor : undefined
    })));
  };

  const handleIngredientToggle = (ingredientId: string) => {
    setIngredients(prev => prev.map(ing => 
      ing.id === ingredientId ? { ...ing, selected: !ing.selected } : ing
    ));
  };

  const handleQuantityChange = (ingredientId: string, newQuantity: number) => {
    if (newQuantity <= 0) return;
    setIngredients(prev => prev.map(ing => 
      ing.id === ingredientId ? { 
        ...ing, 
        quantity: newQuantity,
        converted_quantity: ing.conversion_factor ? newQuantity * ing.conversion_factor : undefined
      } : ing
    ));
  };

  const handleAddToShoppingList = async () => {
    if (!recipe) return;
    
    setLoading(true);
    try {
      const selectedIngredients = ingredients.filter(ing => ing.selected);
      await onAddToShoppingList(selectedIngredients, portions);
      onClose();
    } catch (error) {
      console.error('Error adding ingredients to shopping list:', error);
      sentryErrorService.reportApiError(error, {
        url: 'add-ingredients-dialog',
        method: 'POST',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !recipe) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Zutaten hinzufügen
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <FontAwesomeIcon icon="fa-xmark" size="lg" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {recipe.name} - {portions} Portion{portions !== 1 ? 'en' : ''}
          </p>
        </div>

        {/* Offline notice */}
        {!isOnline && (
          <div className="px-6 py-3 border-b border-gray-200 bg-yellow-50 text-yellow-800 text-sm">
            Du bist offline. Zutaten können nicht geladen werden.
          </div>
        )}

        {/* Portions selector */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Portionen:</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePortionChange(portions - 1)}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={portions <= 1}
              >
                <FontAwesomeIcon icon="fa-minus" size="sm" className="text-gray-700" />
              </button>
              <input
                type="number"
                value={portions}
                onChange={(e) => handlePortionChange(parseInt(e.target.value) || 1)}
                className="w-16 text-center border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 bg-white"
                min="1"
              />
              <button
                onClick={() => handlePortionChange(portions + 1)}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 hover:border-gray-400"
              >
                <FontAwesomeIcon icon="fa-plus" size="sm" className="text-gray-700" />
              </button>
            </div>
          </div>
          {portions !== recipe.portions && (
            <div className="mt-3 text-center">
              <button
                onClick={resetToBaseQuantities}
                className="text-sm text-orange-600 hover:text-orange-700 underline"
              >
                Zurück zu {recipe.portions} Portion{recipe.portions !== 1 ? 'en' : ''}
              </button>
            </div>
          )}
        </div>

        {/* Ingredients list */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          <div className="space-y-3">
            {ingredients.map((ingredient) => (
              <div key={ingredient.id} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={ingredient.selected}
                  onChange={() => handleIngredientToggle(ingredient.id)}
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <div className="flex-1 flex items-center space-x-2">
                  <input
                    type="number"
                    value={ingredient.quantity}
                    onChange={(e) => handleQuantityChange(ingredient.id, parseFloat(e.target.value) || 0)}
                    className="w-20 text-center border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 bg-white"
                    min="0"
                    step="0.1"
                  />
                  {ingredient.unit_name && (
                    <span className="text-sm text-gray-600 min-w-[2rem]">
                      {ingredient.unit_name}
                    </span>
                  )}
                  <span className="text-sm text-gray-900 flex-1">
                    {ingredient.ingredient_name}
                  </span>
                  {/* Show converted quantity if available */}
                  {ingredient.converted_quantity && ingredient.grocery_unit_name && (
                    <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      ≈ {ingredient.converted_quantity.toFixed(1)} {ingredient.grocery_unit_short_name || ingredient.grocery_unit_name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              onClick={handleAddToShoppingList}
              disabled={!isOnline || loading || ingredients.filter(ing => ing.selected).length === 0}
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Wird hinzugefügt...
                </div>
              ) : (
                'Zur Einkaufsliste hinzufügen'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CookbookPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { listId } = useParams<{ listId: string }>();
  const { user } = useAuth();
  const searchValue = useSelector((state: RootState) => state.search.value);
  const { 
    recipes, 
    loading, 
    loadingMore,
    error, 
    hasMore,
    isSearching,
    searchTerm,
    addIngredientsToShoppingList,
    loadMoreRecipes,
    searchRecipes,
    clearSearch
  } = useCookbookRecipes(10); // 10 Einträge pro Seite
  const [selectedRecipe, setSelectedRecipe] = useState<CookbookRecipe | null>(null);
  const [showIngredientsDialog, setShowIngredientsDialog] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  
  // Intersection Observer für Endless Scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  // Set header
  useEffect(() => {
    dispatch(setHeader({
      title: 'Kochbuch',
      showBack: false,
      showHomeIcon: true,
      showFilterIcon: false,
      showSearchBar: true,
      background: 'bg-orange-500'
    }));
  }, [dispatch]);

  // Connectivity tracking for offline UX
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle search input changes with debounce
  useEffect(() => {
    if (!searchValue.trim()) {
      // Clear search and return to normal cookbook view
      if (isSearching) {
        clearSearch();
      }
      return;
    }

    // Debounce search input
    const timeoutId = setTimeout(() => {
      console.log('Searching for:', searchValue);
      searchRecipes(searchValue, 0, false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchValue, isSearching, clearSearch, searchRecipes]);

  // Intersection Observer für Endless Scroll
  useEffect(() => {
    console.log('Intersection Observer effect triggered:', { hasMore, loadingMore, recipesLength: recipes.length });
    
    // Always disconnect previous observer first
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
      console.log('Previous observer disconnected');
    }

    if (!hasMore || loadingMore) {
      console.log('Observer not needed - no more items or already loading');
      return;
    }

    // Create new observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          console.log('Intersection Observer entry:', { isIntersecting: entry.isIntersecting, hasMore, loadingMore });
          if (entry.isIntersecting && hasMore && !loadingMore) {
            console.log('Intersection Observer triggered - loading more recipes');
            loadMoreRecipes();
          }
        });
      },
      { 
        threshold: 0.1, 
        rootMargin: '200px', // Increased margin to trigger earlier
        root: null
      }
    );

    observerRef.current = observer;

    // Use setTimeout to ensure the DOM element is available
    setTimeout(() => {
      const currentLoadingRef = loadingRef.current;
      if (currentLoadingRef && observerRef.current) {
        observerRef.current.observe(currentLoadingRef);
        console.log('Observer attached to loadingRef successfully');
      } else {
        console.log('Warning: Cannot attach observer - loadingRef or observer not available');
      }
    }, 100);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
        console.log('Observer disconnected in cleanup');
      }
    };
  }, [hasMore, loadingMore, loadMoreRecipes, recipes.length]);

  // Re-attach observer when recipes change to ensure it's observing the correct element
  useEffect(() => {
    if (hasMore && !loadingMore && observerRef.current && loadingRef.current) {
      console.log('Re-attaching observer after recipes change');
      observerRef.current.disconnect();
      observerRef.current.observe(loadingRef.current);
    }
  }, [recipes.length, hasMore, loadingMore]);

  // Fallback scroll event listener for endless scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!hasMore || loadingMore) return;
      
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // If user is near bottom (within 200px), load more
      if (scrollTop + windowHeight >= documentHeight - 200) {
        console.log('Scroll near bottom detected - loading more recipes');
        loadMoreRecipes();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, loadMoreRecipes]);

  // Redirect if no listId is provided
  useEffect(() => {
    if (!listId) {
      console.log('CookbookPage - No listId found, redirecting to /lists');
      navigate('/lists');
    }
  }, [listId, navigate]);

  // Don't render if no listId
  if (!listId) {
    console.log('CookbookPage - Rendering null because no listId');
    return null;
  }

  const getTotalTime = (recipe: CookbookRecipe): number => {
    return (recipe.working_time_minutes || 0) + 
           (recipe.cooking_time_minutes || 0) + 
           (recipe.resting_time_minutes || 0);
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} Min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const openRecipe = (recipe: CookbookRecipe) => {
    const slug = slugify(recipe.name);
    const url = `${getSiteUrl()}/rezepte/${recipe.id}/${slug}`;
    window.open(url, '_blank');
  };

  const openSiteUrl = () => {
    window.open(`${getSiteUrl()}/alle-rezepte`, '_blank');
  };

  const handleAddIngredientsToShoppingList = async (ingredients: RecipeIngredient[], portions: number) => {
    if (!listId) {
      alert('Keine Einkaufsliste gefunden. Bitte öffne zuerst eine Einkaufsliste.');
      return;
    }

    try {
      const success = await addIngredientsToShoppingList(listId, ingredients, portions);
      
      if (success) {
        const selectedCount = ingredients.filter(ing => ing.selected).length;
        alert(`${selectedCount} Zutaten für ${portions} Portionen wurden erfolgreich zur Einkaufsliste hinzugefügt!`);
        
        // Navigate back to the shopping list
        navigate(`/shopping-list/${listId}`);
      } else {
        alert('Fehler beim Hinzufügen der Zutaten zur Einkaufsliste. Bitte versuche es erneut.');
      }
    } catch (error) {
      console.error('Error adding ingredients to shopping list:', error);
      sentryErrorService.reportApiError(error, {
        url: 'add-ingredients-main',
        method: 'POST',
      });
      alert('Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.');
    }
  };

  const openIngredientsDialog = (recipe: CookbookRecipe, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent opening the recipe
    
    if (!listId) {
      alert('Keine Einkaufsliste gefunden. Bitte öffne zuerst eine Einkaufsliste.');
      return;
    }
    
    setSelectedRecipe(recipe);
    setShowIngredientsDialog(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-4 pb-24">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    // If offline, show offline-friendly message instead of raw error
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    return (
      <div className="min-h-screen bg-gray-50 pt-4 pb-24">
        <div className="text-center py-16">
          <div className="mb-6">
            <FontAwesomeIcon 
              icon="fa-exclamation-triangle" 
              size="4xl" 
              className="text-red-400 mx-auto"
            />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {offline ? 'Keine Internetverbindung' : 'Fehler beim Laden des Kochbuchs'}
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            {offline ? 'Du bist offline. Stelle eine Internetverbindung her, um das Kochbuch zu laden.' : (error || 'Unbekannter Fehler ist aufgetreten.')}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            {offline ? 'Erneut versuchen (nach Verbindung)' : 'Erneut versuchen'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-4 pb-24">
      <div className="max-w-4xl mx-auto px-4">
        {recipes.length === 0 && !searchValue.trim() ? (
          <div className="text-center py-16">
            <div className="mb-6">
              <FontAwesomeIcon 
                icon="fa-book" 
                size="4xl" 
                style="regular" 
                className="text-gray-300 mx-auto"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Noch keine Rezepte im Kochbuch
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Füge Rezepte zu deinem Kochbuch hinzu, um die Zutaten direkt in deine Einkaufsliste zu überführen.
            </p>
            <button
              onClick={openSiteUrl}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Neue Rezepte entdecken
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {!searchValue.trim() && (
              <div className="text-center py-6 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Entdecke weitere Rezepte in ZUTATO
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Finde neue Lieblingsrezepte und erweitere dein Kochbuch
                </p>
                <button
                  onClick={openSiteUrl}
                  className="inline-flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  <FontAwesomeIcon icon="fa-external-link-alt" size="sm" />
                  <span>Zu ZUTATO</span>
                </button>
              </div>
            )}
            
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Deine Lieblingsrezepte
            </h2>
            
            {recipes.length === 0 && searchValue.trim() ? (
              <div className="text-center py-16">
                <div className="mb-6">
                  <FontAwesomeIcon 
                    icon="fa-search" 
                    size="4xl" 
                    className="text-gray-300 mx-auto"
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Keine Rezepte gefunden
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Keine Rezepte gefunden, die "{searchValue}" enthalten.
                </p>
                <button
                  onClick={() => dispatch({ type: 'search/clearSearch' })}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Suche löschen
                </button>
              </div>
            ) : (
              <>
                {recipes.map((recipe) => (
                  <div 
                    key={recipe.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer relative group"
                    onClick={() => openRecipe(recipe)}
                  >
                    <div className="flex">
                      <div className="w-24 h-24 flex-shrink-0">
                        {recipe.image_url ? (
                          <img 
                            src={recipe.image_url} 
                            alt={recipe.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <FontAwesomeIcon 
                              icon="fa-utensils" 
                              size="xl" 
                              className="text-gray-400"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 p-4">
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                          {recipe.name}
                        </h3>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <FontAwesomeIcon 
                                icon="fa-clock" 
                                size="sm" 
                                className="mr-1"
                              />
                              <span>{formatTime(getTotalTime(recipe))}</span>
                            </div>
                            <div className="flex items-center">
                              <FontAwesomeIcon 
                                icon="fa-chart-bar" 
                                size="sm" 
                                className="mr-1"
                              />
                              <span className="capitalize">{recipe.difficulty}</span>
                            </div>
                            <div className="flex items-center">
                              <FontAwesomeIcon 
                                icon="fa-star" 
                                size="sm" 
                                className="text-yellow-400 mr-1"
                              />
                              {recipe.rating ? (
                                <span>{recipe.rating.toFixed(1)}/5 ({recipe.rating_count})</span>
                              ) : (
                                <span>Keine Bewertungen</span>
                              )}
                            </div>
                          </div>
                          <FontAwesomeIcon 
                            icon="fa-external-link-alt" 
                            size="sm" 
                            className="text-gray-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Add ingredients button */}
                    <button
                      onClick={(e) => openIngredientsDialog(recipe, e)}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                      style={{ borderRadius: 'unset' }}
                    >
                      <FontAwesomeIcon icon="fa-plus" size="sm" />
                      <span>Zutaten zur Einkaufsliste hinzufügen</span>
                    </button>
                  </div>
                ))}

                {/* Loading indicator for more recipes */}
                {loadingMore && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Lade weitere Rezepte...</p>
                  </div>
                )}
                
                {/* End of list indicator for endless scroll */}
                {!loadingMore && hasMore && !searchValue.trim() && (
                  <div ref={loadingRef} className="text-center py-8">
                    <div className="w-8 h-8 mx-auto mb-2">
                      <FontAwesomeIcon 
                        icon="fa-chevron-down" 
                        size="lg" 
                        className="text-gray-400 animate-bounce"
                      />
                    </div>
                    <p className="text-gray-500 text-sm">
                      Scrollen Sie nach unten für weitere Rezepte
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Bereits {recipes.length} Rezepte geladen
                    </p>
                    {/* Debug info */}
                    <div className="text-xs text-gray-300 mt-2">
                      Debug: hasMore={hasMore.toString()}, loadingMore={loadingMore.toString()}, pageSize=5
                    </div>
                    {/* Manual load button for testing */}
                    <button
                      onClick={() => {
                        console.log('Manual load button clicked');
                        loadMoreRecipes();
                      }}
                      className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                    >
                      Manuell mehr laden (Test)
                    </button>
                  </div>
                )}
                
                {/* End of list message */}
                {!hasMore && recipes.length > 0 && !searchValue.trim() && (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-3">
                      <FontAwesomeIcon 
                        icon="fa-check-circle" 
                        size="2xl" 
                        className="text-green-400"
                      />
                    </div>
                    <p className="text-gray-600">Alle Rezepte wurden geladen</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Insgesamt {recipes.length} Rezepte in deinem Kochbuch
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-20 z-20">
        <button 
          className="flex flex-col items-center justify-center flex-1 py-2 text-gray-600"
          onClick={() => navigate(-1)}
        >
          <FontAwesomeIcon icon="fa-square-poll-vertical" size="3xl" style="regular" className="mb-1"/>
          <span className="text-xs font-semibold">Einkaufsliste</span>
        </button>
        <button className="flex flex-col items-center justify-center flex-1 py-2 text-orange-600">
          <FontAwesomeIcon icon="fa-book" size="3xl" style="regular" className="mb-1"/>
          <span className="text-xs font-semibold">Kochbuch</span>
        </button>
      </div>

      {/* Ingredients Dialog */}
      <AddIngredientsDialog
        isOpen={showIngredientsDialog}
        onClose={() => {
          setShowIngredientsDialog(false);
          setSelectedRecipe(null);
        }}
        recipe={selectedRecipe}
        onAddToShoppingList={handleAddIngredientsToShoppingList}
        isOnline={isOnline}
      />
    </div>
  );
};

export default CookbookPage;
