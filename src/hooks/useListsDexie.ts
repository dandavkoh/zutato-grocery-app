import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect } from 'react';
import { db, type List } from '../services/dexieService';
import { ListsController } from '../api/supabaseApi';

const listsController = new ListsController();

export const useListsDexie = () => {
  // Load lists from Dexie using Live Query
  const lists = useLiveQuery(
    () => db.lists
      .filter(list => !list.is_deleted)
      .reverse()
      .sortBy('created_at'),
    []
  ) || [];

  // Sync with Supabase on mount (fire and forget)
  useEffect(() => {
    // Fire and forget - sync with Supabase in background
    listsController.getLists().catch(error => {
      console.error('Background Supabase sync failed:', error);
    });
  }, []);

  return {
    lists,
    loading: lists === undefined, // Live Query loading state
    error: null, // Live Query handles errors internally
  };
}; 