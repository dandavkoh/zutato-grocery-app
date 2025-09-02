import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { ShoppingItemsController } from '../api/supabaseApi';
import { generateGuid } from '../utils/guidUtils';

export interface CookbookRecipe {
  id: string;
  name: string;
  description?: string;
  portions: number;
  difficulty: 'einfach' | 'mittel' | 'schwer';
  working_time_minutes?: number;
  cooking_time_minutes?: number;
  resting_time_minutes?: number;
  image_url?: string;
  created_at: string;
  updated_at: string;
  rating?: number;
  rating_count?: number;
}

export interface RecipeIngredient {
  id: string;
  quantity: number;
  unit_id?: string;
  unit_name?: string;
  unit_short_name?: string;
  ingredient_name: string;
  selected: boolean;
  baseQuantity: number;
  // Recipe ingredient linking
  product_group_id?: string;
  product_id?: string;
  custom_ingredient_name?: string;
  // Converted grocery unit information
  grocery_unit_id?: string;
  grocery_unit_name?: string;
  grocery_unit_short_name?: string;
  converted_quantity?: number;
  conversion_factor?: number;
}

export const useCookbookRecipes = (pageSize: number = 10) => {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<CookbookRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Reset pagination when user changes
  useEffect(() => {
    setRecipes([]);
    setCurrentPage(0);
    setHasMore(true);
    setIsSearching(false);
    setSearchTerm('');
  }, [user]);

  // Load cookbook recipes with pagination
  const loadCookbookRecipes = useCallback(async (page: number = 0, append: boolean = false) => {
    if (!user) return;

    try {
      if (page === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      console.log('Loading cookbook recipes - page:', page, 'pageSize:', pageSize);
      
      // 1. Get paginated cookbook entries
      const { data: cookbookEntries, error: cookbookError, count } = await supabase
        .from('user_cookbook_recipes')
        .select('recipe_id', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (cookbookError) {
        throw cookbookError;
      }

      if (!cookbookEntries || cookbookEntries.length === 0) {
        if (page === 0) {
          setRecipes([]);
        }
        setHasMore(false);
        return;
      }

      // 2. Check if there are more pages
      const totalEntries = count || 0;
      const hasMorePages = totalEntries > (page + 1) * pageSize;
      setHasMore(hasMorePages);
      
      console.log('Cookbook entries loaded:', {
        page,
        entriesCount: cookbookEntries.length,
        totalEntries,
        hasMore: hasMorePages
      });
      console.log('hasMore calculation:', { 
        totalEntries, 
        currentPagePlusOne: page + 1, 
        pageSize, 
        calculation: totalEntries > (page + 1) * pageSize 
      });

      // 3. Get recipe details for these entries
      const recipeIds = cookbookEntries.map(entry => entry.recipe_id);
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .select(`
          id,
          name,
          description,
          portions,
          difficulty,
          working_time_minutes,
          cooking_time_minutes,
          resting_time_minutes,
          image_url,
          created_at,
          updated_at
        `)
        .in('id', recipeIds);

      if (recipeError) {
        throw recipeError;
      }

      // 4. Transform recipes and fetch ratings
      // Create a map to preserve the original order from cookbook entries
      const recipeMap = new Map();
      recipeData?.forEach(item => {
        recipeMap.set(item.id, {
          id: item.id,
          name: item.name,
          description: item.description,
          portions: item.portions,
          difficulty: item.difficulty,
          working_time_minutes: item.working_time_minutes,
          cooking_time_minutes: item.cooking_time_minutes,
          resting_time_minutes: item.resting_time_minutes,
          image_url: item.image_url,
          created_at: item.created_at,
          updated_at: item.updated_at,
        });
      });

      // Preserve the original order from cookbook entries
      const transformedRecipes: CookbookRecipe[] = cookbookEntries
        .map(entry => recipeMap.get(entry.recipe_id))
        .filter(recipe => recipe && recipe.id && recipe.name);

      // 5. Fetch ratings for each recipe
      const recipesWithRatings = await Promise.all(
        transformedRecipes.map(async (recipe) => {
          const { data: ratingData, error: ratingError } = await supabase
            .from('recipe_ratings')
            .select('rating')
            .eq('recipe_id', recipe.id)
            .eq('is_deleted', false);

          if (ratingError) {
            console.warn('Error fetching ratings for recipe:', recipe.id, ratingError);
            return recipe;
          }

          if (ratingData && ratingData.length > 0) {
            const ratings = ratingData.map(r => r.rating);
            const avgRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
            return {
              ...recipe,
              rating: Math.round(avgRating * 10) / 10,
              rating_count: ratings.length
            };
          }

          return recipe;
        })
      );

      // 6. Update state
      if (append) {
        setRecipes(prev => [...prev, ...recipesWithRatings]);
      } else {
        setRecipes(recipesWithRatings);
      }
      
      setCurrentPage(page);
      console.log('Recipes loaded successfully:', {
        page,
        recipesCount: recipesWithRatings.length,
        totalRecipes: recipes.length + (append ? recipesWithRatings.length : 0),
        hasMore: hasMorePages
      });

    } catch (err) {
      console.error('Error loading cookbook recipes:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, pageSize]);

  // Initial load
  useEffect(() => {
    if (user) {
      loadCookbookRecipes(0, false);
    } else {
      setRecipes([]);
      setLoading(false);
      setHasMore(false);
    }
  }, [user, loadCookbookRecipes]);

  // Search recipes in database with pagination
  const searchRecipes = useCallback(async (term: string, page: number = 0, append: boolean = false) => {
    if (!user || !term.trim()) return;

    try {
      if (page === 0) {
        setLoading(true);
        setIsSearching(true);
        setSearchTerm(term);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      console.log('Searching recipes for term:', term, 'page:', page);
      
      // Search in recipes table with pagination
      const { data, error: searchError, count } = await supabase
        .from('recipes')
        .select(`
          id,
          name,
          description,
          portions,
          difficulty,
          working_time_minutes,
          cooking_time_minutes,
          resting_time_minutes,
          image_url,
          created_at,
          updated_at
        `, { count: 'exact' })
        .ilike('name', `%${term}%`)
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('created_at', { ascending: false });

      if (searchError) {
        throw searchError;
      }

      // Check if we have more pages
      const totalResults = count || 0;
      const hasMorePages = totalResults > (page + 1) * pageSize;
      setHasMore(hasMorePages);

      // Transform and fetch ratings
      const transformedRecipes: CookbookRecipe[] = data
        ?.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          portions: item.portions,
          difficulty: item.difficulty,
          working_time_minutes: item.working_time_minutes,
          cooking_time_minutes: item.cooking_time_minutes,
          resting_time_minutes: item.resting_time_minutes,
          image_url: item.image_url,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }))
        .filter(recipe => recipe.id && recipe.name) || [];

      // Fetch ratings for each recipe
      const recipesWithRatings = await Promise.all(
        transformedRecipes.map(async (recipe) => {
          const { data: ratingData, error: ratingError } = await supabase
            .from('recipe_ratings')
            .select('rating')
            .eq('recipe_id', recipe.id)
            .eq('is_deleted', false);

          if (ratingError) {
            console.warn('Error fetching ratings for recipe:', recipe.id, ratingError);
            return recipe;
          }

          if (ratingData && ratingData.length > 0) {
            const ratings = ratingData.map(r => r.rating);
            const avgRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
            return {
              ...recipe,
              rating: Math.round(avgRating * 10) / 10,
              rating_count: ratings.length
            };
          }

          return recipe;
        })
      );

      if (append) {
        setRecipes(prev => [...prev, ...recipesWithRatings]);
      } else {
        setRecipes(recipesWithRatings);
      }
      
      setCurrentPage(page);
      console.log('Search completed:', { page, resultsCount: recipesWithRatings.length, hasMore: hasMorePages });
    } catch (err) {
      console.error('Error searching recipes:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, pageSize]);

  // Load more recipes
  const loadMoreRecipes = useCallback(async () => {
    if (!hasMore || loadingMore || !user) {
      console.log('Cannot load more:', { hasMore, loadingMore, user: !!user });
      return;
    }
    
    const nextPage = currentPage + 1;
    console.log('Loading more recipes - next page:', nextPage, 'isSearching:', isSearching, 'searchTerm:', searchTerm);
    
    // If we're searching, load more search results, otherwise load more cookbook recipes
    if (isSearching && searchTerm) {
      await searchRecipes(searchTerm, nextPage, true);
    } else {
      await loadCookbookRecipes(nextPage, true);
    }
  }, [hasMore, loadingMore, currentPage, loadCookbookRecipes, user, isSearching, searchTerm, searchRecipes]);

  // Clear search and return to normal view
  const clearSearch = useCallback(() => {
    setIsSearching(false);
    setSearchTerm('');
    setCurrentPage(0);
    setHasMore(true);
    loadCookbookRecipes(0, false);
  }, [loadCookbookRecipes]);

  // Add recipe to cookbook
  const addToCookbook = async (recipeId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_cookbook_recipes')
        .insert({
          user_id: user.id,
          recipe_id: recipeId
        });

      if (error) {
        throw error;
      }

      // Refresh the recipes list
      await loadCookbookRecipes(0, false);
      return true;
    } catch (err) {
      console.error('Error adding recipe to cookbook:', err);
      return false;
    }
  };

  // Remove recipe from cookbook
  const removeFromCookbook = async (recipeId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_cookbook_recipes')
        .delete()
        .eq('user_id', user.id)
        .eq('recipe_id', recipeId);

      if (error) {
        throw error;
      }

      // Refresh the recipes list
      await loadCookbookRecipes(0, false);
      return true;
    } catch (err) {
      console.error('Error removing recipe from cookbook:', err);
      return false;
    }
  };

  // Check if recipe is in cookbook
  const isInCookbook = (recipeId: string): boolean => {
    return recipes.some(recipe => recipe.id === recipeId);
  };

  // Function to fetch recipe ingredients with unit conversion
  const fetchRecipeIngredients = async (recipeId: string): Promise<RecipeIngredient[]> => {
    try {
      // Fetch recipe ingredients with unit information
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .select(`
          id,
          quantity,
          unit_id,
          product_group_id,
          product_id,
          custom_ingredient_name,
          recipe_units (
            name,
            short_name
          )
        `)
        .eq('recipe_id', recipeId);

      if (ingredientsError) {
        throw ingredientsError;
      }

      if (!ingredientsData) return [];

      // Transform ingredients and fetch unit conversions
      const ingredients: RecipeIngredient[] = await Promise.all(
        ingredientsData.map(async (ingredient) => {
          let ingredientName = '';
          if (ingredient.product_group_id) {
            const { data: productGroup } = await supabase
              .from('product_groups')
              .select('title')
              .eq('id', ingredient.product_group_id)
              .single();
            ingredientName = productGroup?.title || 'Unbekannte Zutat';
          } else if (ingredient.product_id) {
            const { data: product } = await supabase
              .from('products')
              .select('title')
              .eq('id', ingredient.product_id)
              .single();
            ingredientName = product?.title || 'Unbekannte Zutat';
          } else {
            ingredientName = ingredient.custom_ingredient_name || 'Unbekannte Zutat';
          }

          // Get unit conversion if unit_id exists
          let groceryUnitInfo = {};
          if (ingredient.unit_id) {
            const { data: conversionData } = await supabase
              .from('recipe_units_to_grocery_units_map')
              .select(`
                conversion_factor,
                grocery_units (
                  id,
                  name,
                  short_name
                )
              `)
              .eq('recipe_unit_id', ingredient.unit_id)
              .single();

            if (conversionData && conversionData.grocery_units && conversionData.grocery_units.length > 0) {
              groceryUnitInfo = {
                grocery_unit_id: conversionData.grocery_units[0]?.id,
                grocery_unit_name: conversionData.grocery_units[0]?.name,
                grocery_unit_short_name: conversionData.grocery_units[0]?.short_name,
                conversion_factor: conversionData.conversion_factor,
                converted_quantity: ingredient.quantity * conversionData.conversion_factor
              };
            }
          }

          return {
            id: ingredient.id,
            quantity: ingredient.quantity,
            unit_id: ingredient.unit_id,
            unit_name: ingredient.recipe_units?.[0]?.name,
            unit_short_name: ingredient.recipe_units?.[0]?.short_name,
            ingredient_name: ingredientName,
            selected: true,
            baseQuantity: ingredient.quantity,
            product_group_id: ingredient.product_group_id,
            product_id: ingredient.product_id,
            custom_ingredient_name: ingredient.custom_ingredient_name,
            ...groceryUnitInfo
          };
        })
      );

      return ingredients;
    } catch (err) {
      console.error('Error fetching recipe ingredients:', err);
      return [];
    }
  };

  // Function to add ingredients to shopping list
  const addIngredientsToShoppingList = async (
    listId: string, 
    ingredients: RecipeIngredient[], 
    portions: number
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const shoppingItemsController = new ShoppingItemsController();
      
      // Process each selected ingredient
      for (const ingredient of ingredients.filter(ing => ing.selected)) {
        // Determine final name and category
        let finalName = ingredient.ingredient_name;
        let categoryId: string | null = null;
        
        // If ingredient has a product_group_id, get product group details
        if (ingredient.product_group_id) {
          const { data: productGroup } = await supabase
            .from('product_groups')
            .select('id, title, default_category_id')
            .eq('id', ingredient.product_group_id)
            .single();

          if (productGroup) {
            finalName = productGroup.title;
            categoryId = productGroup.default_category_id || null;
          }
        }
        // If ingredient has a product_id, get product details
        else if (ingredient.product_id) {
          const { data: product } = await supabase
            .from('products')
            .select('id, title, default_category_id')
            .eq('id', ingredient.product_id)
            .single();

          if (product) {
            finalName = product.title;
            categoryId = product.default_category_id || null;
          }
        }
        // Otherwise, try to find a matching product group by name
        else if (ingredient.ingredient_name) {
          // First try to find an exact match
          let { data: productGroup } = await supabase
            .from('product_groups')
            .select('id, title, default_category_id')
            .ilike('title', ingredient.ingredient_name)
            .limit(1)
            .single();

          // If no exact match, try partial match
          if (!productGroup) {
            const { data: partialMatches } = await supabase
              .from('product_groups')
              .select('id, title, default_category_id')
              .ilike('title', `%${ingredient.ingredient_name}%`)
              .limit(1);

            if (partialMatches && partialMatches.length > 0) {
              productGroup = partialMatches[0];
            }
          }

          if (productGroup) {
            finalName = productGroup.title;
            categoryId = productGroup.default_category_id || null;
          }
        }

        // Use converted quantity and grocery unit if available
        const finalQuantity = ingredient.converted_quantity || ingredient.quantity;
        const finalUnitId = ingredient.grocery_unit_id || null;

        // Create shopping item using the API
        const itemData = {
          id: generateGuid(),
          name: finalName,
          category_id: categoryId,
          icon: undefined,
          unit_id: finalUnitId,
          quantity: finalQuantity,
          listId: listId,
          createdBy: user.id,
          notes: undefined,
          store: undefined,
          assignedTo: undefined
        };

        const response = await shoppingItemsController.createItem(itemData);
        if (response.error) {
          console.error('Error creating shopping item:', response.error);
          throw new Error(response.error);
        }
      }

      return true;
    } catch (err) {
      console.error('Error adding ingredients to shopping list:', err);
      return false;
    }
  };

  return {
    recipes,
    loading,
    loadingMore,
    error,
    hasMore,
    currentPage,
    isSearching,
    searchTerm,
    loadMoreRecipes,
    searchRecipes,
    clearSearch,
    addToCookbook,
    removeFromCookbook,
    isInCookbook,
    fetchRecipeIngredients,
    addIngredientsToShoppingList,
    refresh: () => {
      if (isSearching) {
        searchRecipes(searchTerm, 0, false);
      } else {
        loadCookbookRecipes(0, false);
      }
    }
  };
};
