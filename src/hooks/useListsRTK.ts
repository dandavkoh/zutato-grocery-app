import { useCallback } from 'react';
import {
  useGetListsQuery,
  useGetListQuery,
  useCreateListMutation,
  useUpdateListMutation,
  useDeleteListMutation,
  useGetListMembersQuery,
  useAddListMemberMutation,
  useRemoveListMemberMutation,
} from '../api/listsApi';
import type { CreateListRequest, UpdateListRequest } from '../api/listsApi';

// RTK Query Hook für Lists
export const useListsRTK = () => {
  // Queries
  const {
    data: lists = [],
    isLoading: loading,
    error,
    refetch: loadLists,
    isFetching,
    isSuccess,
    isError,
  } = useGetListsQuery();

  // Mutations
  const [createListMutation, { isLoading: isCreating }] = useCreateListMutation();
  const [updateListMutation, { isLoading: isUpdating }] = useUpdateListMutation();
  const [deleteListMutation, { isLoading: isDeleting }] = useDeleteListMutation();
  const [addListMemberMutation, { isLoading: isAddingMember }] = useAddListMemberMutation();
  const [removeListMemberMutation, { isLoading: isRemovingMember }] = useRemoveListMemberMutation();

  // Logs für Hook-Verhalten
  console.log(`📊 [Lists Hook] Data loaded: ${lists.length} lists, Loading: ${loading}, Success: ${isSuccess}, Error: ${isError}`);

  // Wrapper-Funktionen für bessere API-Kompatibilität
  const createList = useCallback(async (listData: CreateListRequest) => {
    console.log(`➕ [Lists Hook] Creating list: "${listData.name}"`);
    try {
      const result = await createListMutation(listData).unwrap();
      console.log(`✅ [Lists Hook] Successfully created list: "${result.name}"`);
      return result;
    } catch (err) {
      console.error('❌ [Lists Hook] Failed to create list:', err);
      return null;
    }
  }, [createListMutation]);

  const updateList = useCallback(async (id: string, updates: UpdateListRequest) => {
    console.log(`✏️ [Lists Hook] Updating list ID: ${id}`);
    try {
      const result = await updateListMutation({ id, updates }).unwrap();
      console.log(`✅ [Lists Hook] Successfully updated list ID: ${id}`);
      return result;
    } catch (err) {
      console.error('❌ [Lists Hook] Failed to update list:', err);
      return null;
    }
  }, [updateListMutation]);

  const deleteList = useCallback(async (id: string) => {
    console.log(`🗑️ [Lists Hook] Deleting list ID: ${id}`);
    try {
      await deleteListMutation(id).unwrap();
      console.log(`✅ [Lists Hook] Successfully deleted list ID: ${id}`);
      return true;
    } catch (err) {
      console.error('❌ [Lists Hook] Failed to delete list:', err);
      return false;
    }
  }, [deleteListMutation]);

  const addListMember = useCallback(async (listId: string, userId: string, role: 'owner' | 'member' = 'member') => {
    console.log(`👥 [Lists Hook] Adding member to list: ${listId}, user: ${userId}, role: ${role}`);
    try {
      const result = await addListMemberMutation({ listId, userId, role }).unwrap();
      console.log(`✅ [Lists Hook] Successfully added member to list: ${listId}`);
      return result;
    } catch (err) {
      console.error('❌ [Lists Hook] Failed to add member to list:', err);
      return null;
    }
  }, [addListMemberMutation]);

  const removeListMember = useCallback(async (listId: string, userId: string) => {
    console.log(`👤 [Lists Hook] Removing member from list: ${listId}, user: ${userId}`);
    try {
      await removeListMemberMutation({ listId, userId }).unwrap();
      console.log(`✅ [Lists Hook] Successfully removed member from list: ${listId}`);
      return true;
    } catch (err) {
      console.error('❌ [Lists Hook] Failed to remove member from list:', err);
      return false;
    }
  }, [removeListMemberMutation]);

  // Error-Handling
  const errorMessage = error ? 
    ('data' in error ? String(error.data) : 'Unknown error') : 
    null;

  return {
    lists,
    loading: loading || isCreating || isUpdating || isDeleting || isAddingMember || isRemovingMember,
    error: errorMessage,
    loadLists,
    createList,
    updateList,
    deleteList,
    addListMember,
    removeListMember,
  };
};

// Hook für einzelne List
export const useListRTK = (listId: string) => {
  const {
    data: list,
    isLoading: loading,
    error,
    refetch: loadList,
  } = useGetListQuery(listId);

  const errorMessage = error ? 
    ('data' in error ? String(error.data) : 'Unknown error') : 
    null;

  return {
    list,
    loading,
    error: errorMessage,
    loadList,
  };
};

// Hook für einzelne List mit Mitgliedern
export const useListWithMembersRTK = (listId: string) => {
  const {
    data: list,
    isLoading: loading,
    error,
    refetch: loadList,
  } = useGetListQuery(listId);

  const {
    data: members = [],
    isLoading: membersLoading,
    error: membersError,
    refetch: loadMembers,
  } = useGetListMembersQuery(listId);

  const errorMessage = error ? 
    ('data' in error ? String(error.data) : 'Unknown error') : 
    null;

  const membersErrorMessage = membersError ? 
    ('data' in membersError ? String(membersError.data) : 'Unknown error') : 
    null;

  return {
    list,
    members,
    loading: loading || membersLoading,
    error: errorMessage || membersErrorMessage,
    loadList,
    loadMembers,
  };
}; 