import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect } from 'react';
import { db, type Category } from '../services/dexieService';
import { CategoryController } from '../api/supabaseApi';

const categoryController = new CategoryController();

export const useCategoriesDexie = () => {
  const categories = useLiveQuery(
    () => db.categories
      .orderBy('name')
      .toArray(),
    []
  ) || [];

  useEffect(() => {
    categoryController.getCategories().catch(error => {
      console.error('Background Supabase sync failed:', error);
    });
  }, []);

  const getCategoryById = useCallback(async (id: string) => {
    try {
      const category = await db.categories.get(id);
      return category;
    } catch (err) {
      console.error('Error getting category by ID:', err);
      throw err;
    }
  }, []);

  return {
    categories,
    loading: categories === undefined,
    error: null,
    getCategoryById,
  };
}; 