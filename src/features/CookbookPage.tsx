import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setHeader } from '../stores/store';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import { getSiteUrl } from '../config/environment';
import { useCookbookRecipes, type CookbookRecipe, type RecipeIngredient } from '../hooks/useCookbookRecipes';
import { slugify } from '../utils/slugify';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';

interface AddIngredientsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: CookbookRecipe | null;
  onAddToShoppingList: (ingredients: RecipeIngredient[], portions: number) => void;
}

const AddIngredientsDialog: React.FC<AddIngredientsDialogProps> = ({
  isOpen,
  onClose,
  recipe,
  onAddToShoppingList
}) => {
  const [portions, setPortions] = useState(1);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [loading, setLoading] = useState(false);
  const { fetchRecipeIngredients } = useCookbookRecipes();

  useEffect(() => {
    if (recipe && isOpen) {
      setPortions(recipe.portions);
      loadRecipeIngredients(recipe.id);
    }
  }, [recipe, isOpen]);

  const loadRecipeIngredients = async (recipeId: string) => {
    try {
      const recipeIngredients = await fetchRecipeIngredients(recipeId);
      setIngredients(recipeIngredients);
    } catch (error) {
      console.error('Error loading recipe ingredients:', error);
      // Fallback to mock data if loading fails
      setIngredients([
        { id: '1', quantity: 200, unit_name: 'g', ingredient_name: 'Mehl', selected: true, baseQuantity: 200 },
        { id: '2', quantity: 100, unit_name: 'g', ingredient_name: 'Zucker', selected: true, baseQuantity: 100 },
        { id: '3', quantity: 2, unit_name: 'Stück', ingredient_name: 'Eier', selected: true, baseQuantity: 2 },
        { id: '4', quantity: 1, unit_name: 'Prise', ingredient_name: 'Salz', selected: true, baseQuantity: 1 },
      ]);
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
              disabled={loading || ingredients.filter(ing => ing.selected).length === 0}
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
  const { recipes, loading, error, removeFromCookbook, addIngredientsToShoppingList } = useCookbookRecipes();
  const [selectedRecipe, setSelectedRecipe] = useState<CookbookRecipe | null>(null);
  const [showIngredientsDialog, setShowIngredientsDialog] = useState(false);

  // Set header
  useEffect(() => {
    dispatch(setHeader({
      title: 'Kochbuch',
      showBack: true,
      showFilterIcon: false,
      background: 'bg-orange-500'
    }));
  }, [dispatch]);

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
    window.open(getSiteUrl(), '_blank');
  };

  const handleRemoveFromCookbook = async (recipeId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent opening the recipe
    const success = await removeFromCookbook(recipeId);
    if (success) {
      // Recipe removed successfully
      console.log('Recipe removed from cookbook');
    }
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
            Fehler beim Laden des Kochbuchs
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-4 pb-24">
      <div className="max-w-4xl mx-auto px-4">
        {recipes.length === 0 ? (
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
            
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Deine Lieblingsrezepte ({recipes.length})
            </h2>
            {recipes.map((recipe) => (
              <div 
                key={recipe.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer relative group"
                onClick={() => openRecipe(recipe)}
              >
                {/* Remove button */}
                <button
                  onClick={(e) => handleRemoveFromCookbook(recipe.id, e)}
                  className="absolute top-2 right-2 z-10 p-2 bg-white/80 hover:bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  title="Aus Kochbuch entfernen"
                >
                  <FontAwesomeIcon 
                    icon="fa-heart" 
                    size="sm" 
                    className="text-red-500"
                  />
                </button>

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
      />
    </div>
  );
};

export default CookbookPage;
