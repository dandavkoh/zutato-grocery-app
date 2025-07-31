import { useState, useEffect, useCallback, useRef } from 'react';
import { productGroupsApi, type ProductGroup } from '../api/supabaseApi';

interface UseProductSearchReturn {
  searchResults: ProductGroup[];
  loading: boolean;
  error: string | null;
  searchProducts: (term: string) => void;
  clearSearch: () => void;
}

export const useProductSearch = (debounceMs: number = 300): UseProductSearchReturn => {
  const [searchResults, setSearchResults] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const searchProducts = useCallback((term: string) => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Clear results if term is too short
    if (term.length < 3) {
      setSearchResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Set loading state
    setLoading(true);
    setError(null);

    // Create new debounced search
    debounceTimerRef.current = setTimeout(async () => {
      try {
        // Check if we're online
        if (navigator.onLine) {
          const response = await productGroupsApi.searchProductGroups(term);
          
          if (response.error) {
            setError(response.error);
            setSearchResults([]);
          } else {
            setSearchResults(response.data || []);
          }
        } else {
          // Offline: Create exact suggestion
          console.log('📴 [Search] Offline mode - creating exact suggestion');
          const exactSuggestion: ProductGroup = {
            id: 'exact-suggestion',
            title: term,
            rank: 1.0,
            src: 'exact',
            default_icon: 'basket-shopping',
            default_category_id: ''
          };
          setSearchResults([exactSuggestion]);
          setError(null);
        }
      } catch (err) {
        console.error('❌ [Search] Search error:', err);
        
        // Even if there's an error, show exact suggestion
        const exactSuggestion: ProductGroup = {
          id: 'exact-suggestion',
          title: term,
          rank: 1.0,
          src: 'exact',
          default_icon: 'basket-shopping',
          default_category_id: ''
        };
        setSearchResults([exactSuggestion]);
        setError(null);
      } finally {
        setLoading(false);
      }
    }, debounceMs);
  }, [debounceMs]);

  const clearSearch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setSearchResults([]);
    setLoading(false);
    setError(null);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    searchResults,
    loading,
    error,
    searchProducts,
    clearSearch
  };
}; 