import { useState, useEffect, useCallback } from 'react';
import { ListsController } from '../api/supabaseApi';
import type { List, CreateListRequest, UpdateListRequest, ListMember } from '../api/supabaseApi';
import { pwaService } from '../services/pwaService';

const listsController = new ListsController();

export const useLists = () => {
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load lists
  const loadLists = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await listsController.getLists();
      if (response.error) {
        setError(response.error);
      } else {
        setLists(response.data || []);
      }
    } catch (err) {
      setError('Failed to load lists');
      console.error('Error loading lists:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load lists on mount
  useEffect(() => {
    // Ensure PWA fetch interceptor is active
    //pwaService.ensureFetchInterceptor();
    loadLists();
  }, [loadLists]);

  // Create list
  const createList = useCallback(async (listData: CreateListRequest) => {
    try {
      const response = await listsController.createList(listData);
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Add new list to the list
      setLists(prev => [response.data!, ...prev]);
      return response.data;
    } catch (err) {
      console.error('Error creating list:', err);
      throw err;
    }
  }, []);

  // Update list
  const updateList = useCallback(async (id: string, updates: UpdateListRequest) => {
    try {
      const response = await listsController.updateList(id, updates);
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Update list in the list
      setLists(prev => prev.map(list => 
        list.id === id ? response.data! : list
      ));
      return response.data;
    } catch (err) {
      console.error('Error updating list:', err);
      throw err;
    }
  }, []);

  // Delete list
  const deleteList = useCallback(async (id: string) => {
    try {
      const response = await listsController.deleteList(id);
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Remove list from the list
      setLists(prev => prev.filter(list => list.id !== id));
    } catch (err) {
      console.error('Error deleting list:', err);
      throw err;
    }
  }, []);

  return {
    lists,
    loading,
    error,
    loadLists,
    createList,
    updateList,
    deleteList,
  };
};

export const useList = (listId: string) => {
  const [list, setList] = useState<List | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load list
  const loadList = useCallback(async () => {
    if (!listId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await listsController.getList(listId);
      if (response.error) {
        setError(response.error);
      } else {
        setList(response.data);
      }
    } catch (err) {
      setError('Failed to load list');
      console.error('Error loading list:', err);
    } finally {
      setLoading(false);
    }
  }, [listId]);

  // Load list on mount and when listId changes
  useEffect(() => {
    // Ensure PWA fetch interceptor is active
    //pwaService.ensureFetchInterceptor();
    loadList();
  }, [loadList]);

  return {
    list,
    loading,
    error,
    loadList,
  };
};

export const useListMembers = (listId: string) => {
  const [members, setMembers] = useState<ListMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load members
  const loadMembers = useCallback(async () => {
    if (!listId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await listsController.getListMembers(listId);
      if (response.error) {
        setError(response.error);
      } else {
        setMembers(response.data || []);
      }
    } catch (err) {
      setError('Failed to load members');
      console.error('Error loading members:', err);
    } finally {
      setLoading(false);
    }
  }, [listId]);

  // Load members on mount and when listId changes
  useEffect(() => {
    // Ensure PWA fetch interceptor is active
    //pwaService.ensureFetchInterceptor();
    loadMembers();
  }, [loadMembers]);

  // Add member
  const addMember = useCallback(async (userId: string, role: 'owner' | 'member' = 'member') => {
    try {
      const response = await listsController.addListMember(listId, userId, role);
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Add new member to the list
      setMembers(prev => [...prev, response.data!]);
      return response.data;
    } catch (err) {
      console.error('Error adding member:', err);
      throw err;
    }
  }, [listId]);

  // Remove member
  const removeMember = useCallback(async (userId: string) => {
    try {
      const response = await listsController.removeListMember(listId, userId);
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Remove member from the list
      setMembers(prev => prev.filter(member => member.user_id !== userId));
    } catch (err) {
      console.error('Error removing member:', err);
      throw err;
    }
  }, [listId]);

  return {
    members,
    loading,
    error,
    loadMembers,
    addMember,
    removeMember,
  };
}; 