import { useState, useEffect, useCallback } from 'react';
import { CategoryController } from '../api/supabaseApi';
import type { Category } from '../api/supabaseApi';

const categoryController = new CategoryController();

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load categories
  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await categoryController.getCategories();
      if (response.error) {
        setError(response.error);
      } else {
        setCategories(response.data || []);
      }
    } catch (err) {
      setError('Failed to load categories');
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Get category by ID
  const getCategoryById = useCallback(async (id: string) => {
    try {
      const response = await categoryController.getCategoryById(id);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    } catch (err) {
      console.error('Error getting category by ID:', err);
      throw err;
    }
  }, []);

  return {
    categories,
    loading,
    error,
    loadCategories,
    getCategoryById,
  };
}; 