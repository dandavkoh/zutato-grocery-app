import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect } from 'react';
import { db, type List } from '../services/dexieService';
import { ListsController } from '../api/supabaseApi';
import { sentryErrorService } from '../services/sentryErrorService';

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

  // Refetch function to manually trigger sync
  const refetch = useCallback(async () => {
    try {
      await listsController.getLists();
    } catch (error) {
      console.error('Manual Supabase sync failed:', error);
      sentryErrorService.reportApiError(error, {
        url: 'lists-dexie-sync',
        method: 'GET',
      });
    }
  }, []);

  return {
    lists,
    loading: lists === undefined, // Live Query loading state
    error: null, // Live Query handles errors internally
    refetch,
  };
};

export const useListDexie = (listId: string) => {
  const list = useLiveQuery(
    () => db.lists
      .where('id')
      .equals(listId)
      .filter(list => !list.is_deleted)
      .first(),
    [listId]
  );

  useEffect(() => {
    if (listId) {
      listsController.getList(listId).catch(error => {
        console.error('Background Supabase sync failed:', error);
      });
    }
  }, [listId]);

  return {
    list,
    loading: list === undefined,
    error: null,
  };
}; 