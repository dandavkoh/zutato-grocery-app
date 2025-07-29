import { supabase } from '../config/supabase';
import { logDebug, logError, logInfo } from '../config/environment';
import type { AuthError } from '@supabase/supabase-js';

// Initialize PWA service when Supabase API is imported
if (typeof window !== 'undefined') {
  import('../services/pwaService').then(({ pwaService }) => {
    pwaService.ensureFetchInterceptor();
  });
}

// Auth Types
export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
  created_at?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user?: AuthUser;
  error?: AuthError;
}

// Supabase API Types - Compatible with Supabase
export interface Unit {
  id: string;
  name: string; // Langer Name, z.B. "Packungen"
  short_name: string; // Kurze Abkürzung, z.B. "Pkg"
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface ProductGroup {
  id: string;
  title: string;
  rank: number;
  src: 'fts' | 'fuzzy' | 'exact';
  default_icon: string;
  default_category_id: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  category_id: string | null;
  icon?: string; // Font Awesome icon name (e.g., "fa-apple", "fa-bread-slice")
  unit_id?: string | null;
  quantity?: number;
  is_completed: boolean;
  is_deleted?: boolean;
  created_at: string;
  updatedAt: string;
  listId: string;
  createdBy: string;
  notes?: string;
  store?: string;
  assignedTo?: string;
}

export interface CreateShoppingItemRequest {
  id: string; // Required GUID - must be provided
  name: string;
  category_id: string | null;
  icon?: string;
  unit_id?: string | null;
  quantity?: number;
  listId: string;
  createdBy: string;
  notes?: string;
  store?: string;
  assignedTo?: string;
}

export interface UpdateShoppingItemRequest {
  name?: string;
  category_id?: string | null;
  icon?: string;
  unit_id?: string | null;
  quantity?: number;
  is_completed?: boolean;
  is_deleted?: boolean;
  notes?: string;
  store?: string;
  assignedTo?: string;
}

// Lists API Types
export interface List {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  is_deleted: boolean;
}

export interface CreateListRequest {
  name: string;
  description?: string;
  created_by: string;
}

export interface UpdateListRequest {
  name?: string;
  description?: string;
}

export interface ListMember {
  id: string;
  list_id: string;
  user_id: string;
  role: 'owner' | 'member';
  accepted_at: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

// No more mock data - using real Supabase database

// Supabase API Controller
export class ShoppingItemsController {
  // Get all items for a list
  async getItems(listId: string): Promise<ApiResponse<ShoppingItem[]>> {
    try {
      logDebug('Fetching items from Supabase', { listId });
      
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('list_id', listId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      
      if (error) {
        logError('Failed to fetch items from Supabase', error);
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully fetched items from Supabase', { count: data?.length || 0 });
      return {
        data: data || [],
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error fetching items', error);
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Get items by category
  async getItemsByCategory(listId: string, category_id: string): Promise<ApiResponse<ShoppingItem[]>> {
    try {
      logDebug('Fetching items by category from Supabase', { listId, category_id });
      
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('list_id', listId)
        .eq('category_id', category_id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      
      if (error) {
        logError('Failed to fetch items by category from Supabase', error);
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully fetched items by category from Supabase', { count: data?.length || 0 });
      return {
        data: data || [],
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error fetching items by category', error);
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Get completed items
  async getCompletedItems(listId: string): Promise<ApiResponse<ShoppingItem[]>> {
    try {
      logDebug('Fetching completed items from Supabase', { listId });
      
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('list_id', listId)
        .eq('is_completed', true)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      
      if (error) {
        logError('Failed to fetch completed items from Supabase', error);
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully fetched completed items from Supabase', { count: data?.length || 0 });
      return {
        data: data || [],
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error fetching completed items', error);
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Create new item
  async createItem(itemData: CreateShoppingItemRequest): Promise<ApiResponse<ShoppingItem>> {
    try {
      logDebug('Creating new item in Supabase', { name: itemData.name, id: itemData.id });
      
      const insertData: any = {
        id: itemData.id, // GUID is always required
        name: itemData.name,
        category_id: itemData.category_id,
        icon: itemData.icon,
        unit_id: itemData.unit_id,
        quantity: itemData.quantity,
        list_id: itemData.listId,
        created_by: itemData.createdBy,
        notes: itemData.notes,
        store: itemData.store,
        assigned_to: itemData.assignedTo,
        is_completed: false,
        is_deleted: false,
      };
      
      const { data, error } = await supabase
        .from('shopping_items')
        .insert([insertData])
        .select()
        .single();
      
      if (error) {
        logError('Failed to create item in Supabase', error);
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      // Map database response to our interface
      const shoppingItem: ShoppingItem = {
        id: data.id,
        name: data.name,
        category_id: data.category_id,
        icon: data.icon,
        unit_id: data.unit_id,
        quantity: data.quantity,
        is_completed: data.is_completed,
        is_deleted: data.is_deleted,
        created_at: data.created_at,
        updatedAt: data.updated_at,
        listId: data.list_id,
        createdBy: data.created_by,
        notes: data.notes,
        store: data.store,
        assignedTo: data.assigned_to,
      };
      
      logInfo('Successfully created item in Supabase', { itemId: data.id });
      return {
        data: shoppingItem,
        error: null,
        status: 201
      };
    } catch (error) {
      logError('Unexpected error creating item', error);
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Update item
  async updateItem(id: string, updates: UpdateShoppingItemRequest): Promise<ApiResponse<ShoppingItem>> {
    try {
      logDebug('Updating item in Supabase', { itemId: id });
      
      const updateData: any = { ...updates };
      updateData.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('shopping_items')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        logError('Failed to update item in Supabase', error);
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      // Map database response to our interface
      const shoppingItem: ShoppingItem = {
        id: data.id,
        name: data.name,
        category_id: data.category_id,
        icon: data.icon,
        unit_id: data.unit_id,
        quantity: data.quantity,
        is_completed: data.is_completed,
        is_deleted: data.is_deleted,
        created_at: data.created_at,
        updatedAt: data.updated_at,
        listId: data.list_id,
        createdBy: data.created_by,
        notes: data.notes,
        store: data.store,
        assignedTo: data.assigned_to,
      };
      
      logInfo('Successfully updated item in Supabase', { itemId: id });
      return {
        data: shoppingItem,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error updating item', error);
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Delete item (soft delete)
  async deleteItem(id: string): Promise<ApiResponse<null>> {
    try {
      logDebug('Deleting item in Supabase', { itemId: id });
      
      const { error } = await supabase
        .from('shopping_items')
        .update({ 
          is_deleted: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);
      
      if (error) {
        logError('Failed to delete item in Supabase', error);
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully deleted item in Supabase', { itemId: id });
      return {
        data: null,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error deleting item', error);
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Set item completion status
  async setItemCompletion(id: string, isCompleted: boolean): Promise<ApiResponse<ShoppingItem>> {
    try {
      logDebug('Setting item completion status in Supabase', { itemId: id, isCompleted });
      
      const { data, error } = await supabase
        .from('shopping_items')
        .update({ 
          is_completed: isCompleted,
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        logError('Failed to set item completion status in Supabase', error);
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      // Map database response to our interface
      const shoppingItem: ShoppingItem = {
        id: data.id,
        name: data.name,
        category_id: data.category_id,
        icon: data.icon,
        unit_id: data.unit_id,
        quantity: data.quantity,
        is_completed: data.is_completed,
        is_deleted: data.is_deleted,
        created_at: data.created_at,
        updatedAt: data.updated_at,
        listId: data.list_id,
        createdBy: data.created_by,
        notes: data.notes,
        store: data.store,
        assignedTo: data.assigned_to,
      };
      
      logInfo('Successfully set item completion status in Supabase', { itemId: id, isCompleted });
      return {
        data: shoppingItem,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error setting item completion status', error);
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Toggle item completion (for backward compatibility)
  async toggleItemCompletion(id: string): Promise<ApiResponse<ShoppingItem>> {
    try {
      logDebug('Toggling item completion in Supabase', { itemId: id });
      
      // First get the current item to toggle its completion status
      const { data: currentItem, error: fetchError } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        logError('Failed to fetch item for toggle', fetchError);
        return {
          data: null,
          error: fetchError.message,
          status: 500
        };
      }
      
      const newCompletionStatus = !currentItem.is_completed;
      
      // Use the new setItemCompletion method
      return await this.setItemCompletion(id, newCompletionStatus);
    } catch (error) {
      logError('Unexpected error toggling item completion', error);
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Search items
  async searchItems(listId: string, query: string): Promise<ApiResponse<ShoppingItem[]>> {
    try {
      logDebug('Searching items in Supabase', { listId, query });
      
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('list_id', listId)
        .eq('is_deleted', false)
        .ilike('name', `%${query}%`)
        .order('created_at', { ascending: false });
      
      if (error) {
        logError('Failed to search items in Supabase', error);
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully searched items in Supabase', { count: data?.length || 0 });
      return {
        data: data || [],
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error searching items', error);
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }
}

// Lists API Controller
export class ListsController {
  // Get all lists for current user
  async getLists(): Promise<ApiResponse<List[]>> {
    try {
      logDebug('Fetching lists from Supabase');
      
      // Get lists where user is a member
      const { data, error } = await supabase
        .from('lists')
        .select(`
          *
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      
      if (error) {
        logError('Failed to fetch lists from Supabase', error);
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully fetched lists from Supabase', { count: data?.length || 0 });
      return {
        data: data || [],
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error fetching lists', error);
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Get single list by ID
  async getList(id: string): Promise<ApiResponse<List>> {
    try {
      logDebug('Fetching list by ID from Supabase', { listId: id });
      
      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .single();
      
      if (error) {
        logError('Failed to fetch list from Supabase', error);
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully fetched list from Supabase', { listId: id });
      return {
        data,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error fetching list', error);
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Create new list
  async createList(listData: CreateListRequest): Promise<ApiResponse<List>> {
    try {
      logDebug('Creating new list in Supabase', { name: listData.name });
      
      // Create the list without selecting the result first
      const { data: insertResult, error: listError } = await supabase
        .from('lists')
        .insert({
          name: listData.name,
          description: listData.description,
          created_by: listData.created_by
        });
      
      if (listError) {
        logError('Failed to create list in Supabase', listError);
        return {
          data: null,
          error: listError.message,
          status: 500
        };
      }

      // Get the created list by querying it
      const { data: list, error: fetchError } = await supabase
        .from('lists')
        .select('*')
        .eq('name', listData.name)
        .eq('created_by', listData.created_by)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        logError('Failed to fetch created list', fetchError);
        return {
          data: null,
          error: 'List created but failed to fetch it',
          status: 500
        };
      }
      
      // Add creator as owner member
      const { error: memberError } = await supabase
        .from('list_members')
        .insert([{
          list_id: list.id,
          user_id: listData.created_by,
          role: 'owner',
        }]);
      
      if (memberError) {
        logError('Failed to add creator as member', memberError);
        // List was created but member wasn't added - this is a partial failure
        return {
          data: null,
          error: 'List created but failed to add creator as member',
          status: 500
        };
      }
      
      logInfo('Successfully created list in Supabase', { listId: list.id });
      return {
        data: list,
        error: null,
        status: 201
      };
    } catch (error) {
      logError('Unexpected error creating list', error);
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Update list
  async updateList(id: string, updates: UpdateListRequest): Promise<ApiResponse<List>> {
    try {
      logDebug('Updating list in Supabase', { listId: id });
      
      const updateData: any = { ...updates };
      updateData.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('lists')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        logError('Failed to update list in Supabase', error);
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully updated list in Supabase', { listId: id });
      return {
        data,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error updating list', error);
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Delete list (soft delete)
  async deleteList(id: string): Promise<ApiResponse<null>> {
    try {
      logDebug('Deleting list in Supabase', { listId: id });
      
      const { error } = await supabase
        .from('lists')
        .update({ 
          is_deleted: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);
      
      if (error) {
        logError('Failed to delete list in Supabase', error);
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully deleted list in Supabase', { listId: id });
      return {
        data: null,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error deleting list', error);
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Get list members
  async getListMembers(listId: string): Promise<ApiResponse<ListMember[]>> {
    try {
      logDebug('Fetching list members from Supabase', { listId });
      
      const { data, error } = await supabase
        .from('list_members')
        .select('*')
        .eq('list_id', listId)
        .order('accepted_at', { ascending: true });
      
      if (error) {
        logError('Failed to fetch list members from Supabase', error);
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully fetched list members from Supabase', { count: data?.length || 0 });
      return {
        data: data || [],
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error fetching list members', error);
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Add member to list
  async addListMember(listId: string, userId: string, role: 'owner' | 'member' = 'member'): Promise<ApiResponse<ListMember>> {
    try {
      logDebug('Adding member to list in Supabase', { listId, userId, role });
      
      const { data, error } = await supabase
        .from('list_members')
        .insert([{
          list_id: listId,
          user_id: userId,
          role: role,
        }])
        .select()
        .single();
      
      if (error) {
        logError('Failed to add member to list in Supabase', error);
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully added member to list in Supabase', { listId, userId });
      return {
        data,
        error: null,
        status: 201
      };
    } catch (error) {
      logError('Unexpected error adding member to list', error);
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Remove member from list
  async removeListMember(listId: string, userId: string): Promise<ApiResponse<null>> {
    try {
      logDebug('Removing member from list in Supabase', { listId, userId });
      
      const { error } = await supabase
        .from('list_members')
        .delete()
        .eq('list_id', listId)
        .eq('user_id', userId);
      
      if (error) {
        logError('Failed to remove member from list in Supabase', error);
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully removed member from list in Supabase', { listId, userId });
      return {
        data: null,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error removing member from list', error);
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }
}

// Category API Controller
export class CategoryController {
  // Get all categories
  async getCategories(): Promise<ApiResponse<Category[]>> {
    try {
      logDebug('Fetching categories from Supabase');
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        logError('Failed to fetch categories from Supabase', error);
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully fetched categories from Supabase', { count: data?.length || 0 });
      return {
        data: data || [],
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error fetching categories', error);
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }

  // Get category by ID
  async getCategoryById(id: string): Promise<ApiResponse<Category>> {
    try {
      logDebug('Fetching category by ID from Supabase', { categoryId: id });
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        logError('Failed to fetch category by ID from Supabase', error);
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logInfo('Successfully fetched category by ID from Supabase', { categoryId: id });
      return {
        data: data,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error fetching category by ID', error);
      return {
        data: null,
        error: 'Internal server error',
        status: 500
      };
    }
  }
}

// Unit API Controller
export class UnitController {
  async getUnits(): Promise<ApiResponse<Unit[]>> {
    try {
      logDebug('Fetching units from Supabase');
      
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('name');
      
      if (error) {
        logError('Error fetching units:', error);
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logDebug('Units fetched successfully:', data);
      return {
        data: data || [],
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error fetching units:', error);
      return {
        data: null,
        error: 'Unexpected error occurred',
        status: 500
      };
    }
  }

  async getUnitById(id: string): Promise<ApiResponse<Unit>> {
    try {
      logDebug('Fetching unit by ID:', id);
      
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        logError('Error fetching unit by ID:', error);
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logDebug('Unit fetched successfully:', data);
      return {
        data: data,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error fetching unit by ID:', error);
      return {
        data: null,
        error: 'Unexpected error occurred',
        status: 500
      };
    }
  }
}

export class ProductGroupController {
  async searchProductGroups(
    term: string, 
    limitFts: number = 10, 
    limitFuzzy: number = 10
  ): Promise<ApiResponse<ProductGroup[]>> {
    try {
      logDebug('Searching product groups with term:', term);
      
      const { data, error } = await supabase
        .rpc('search_product_groups', {
          term: term,
          limit_fts: limitFts,
          limit_fuzzy: limitFuzzy
        });
      
      if (error) {
        logError('Error searching product groups:', error);
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      logDebug('Product groups search successful:', data);
      return {
        data: data || [],
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error searching product groups:', error);
      return {
        data: null,
        error: 'Unexpected error occurred',
        status: 500
      };
    }
  }
}

// Database Service Functions
export const shoppingItemsApi = new ShoppingItemsController();
export const listsApi = new ListsController();
export const categoriesApi = new CategoryController();
export const unitsApi = new UnitController();
export const productGroupsApi = new ProductGroupController();

// Auth Service Functions
export const authService = {
  register: async (email: string, password: string, userData: { firstName: string; lastName: string }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
          },
        },
      });
      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error };
    }
  },

  login: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error };
    }
  },

  logout: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      if (user) {
        const authUser: AuthUser = {
          id: user.id,
          email: user.email!,
          firstName: user.user_metadata?.first_name,
          lastName: user.user_metadata?.last_name,
          emailVerified: user.email_confirmed_at !== null,
          created_at: user.created_at,
          updatedAt: user.updated_at,
        };
        return authUser;
      }
      
      return null;
    } catch (error) {
      logError('Unexpected error getting current user', error);
      return null;
    }
  },

  isAuthenticated: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      return !error && !!user;
    } catch (error) {
      console.error('Auth check failed:', error);
      return false;
    }
  },

  onAuthStateChange: (callback: (user: AuthUser | null) => void) => {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email!,
          firstName: session.user.user_metadata?.first_name,
          lastName: session.user.user_metadata?.last_name,
          emailVerified: session.user.email_confirmed_at !== null,
          created_at: session.user.created_at,
          updatedAt: session.user.updated_at,
        };
        callback(authUser);
      } else {
        callback(null);
      }
    });
  },

  resetPassword: async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },
};

// Helper function to group items by category
export const groupItemsByCategory = (items: ShoppingItem[], categories: Category[]) => {
  const grouped: { [categoryName: string]: { items: ShoppingItem[], category: Category } } = {};
  
  const activeItems = items.filter(item => !item.is_deleted);
  
  // Create a map of category IDs to categories
  const categoryMap = new Map<string, Category>();
  categories.forEach(category => {
    categoryMap.set(category.id, category);
  });
  
  activeItems.forEach(item => {
    const category = item.category_id ? categoryMap.get(item.category_id) : null;
    const categoryName = category ? category.name : 'Keine Kategorie';
    const fallbackCategory: Category = {
      id: 'none',
      name: 'Keine Kategorie',
      icon: 'fa-basket-shopping'
    };
    
    if (!grouped[categoryName]) {
      grouped[categoryName] = {
        items: [],
        category: category || fallbackCategory
      };
    }
    grouped[categoryName].items.push(item);
  });
  
  return grouped;
};

// Helper function to get category name by ID
export const getCategoryNameById = (categoryId: string | null, categories: Category[]): string => {
  if (!categoryId) return '';
  const category = categories.find(cat => cat.id === categoryId);
  return category ? category.name : '';
};

// Helper function to get category icon by ID
export const getCategoryIconById = (categoryId: string | null, categories: Category[]): string => {
  if (!categoryId) return 'fa-basket-shopping';
  const category = categories.find(cat => cat.id === categoryId);
  return category ? category.icon : 'fa-basket-shopping';
};

// Helper function to get unit short name by ID
export const getUnitShortNameById = (unitId: string | null, units: Unit[]): string => {
  if (!unitId) return '';
  const unit = units.find(u => u.id === unitId);
  return unit ? unit.short_name : '';
};

// Helper function to get unit full name by ID
export const getUnitNameById = (unitId: string | null, units: Unit[]): string => {
  if (!unitId) return '';
  const unit = units.find(u => u.id === unitId);
  return unit ? unit.name : '';
};

// Helper function to get completed and incomplete items
export const separateCompletedItems = (items: ShoppingItem[]) => {
  const activeItems = items.filter(item => !item.is_deleted);
  
  const completed = activeItems.filter(item => item.is_completed);
  const incomplete = activeItems.filter(item => !item.is_completed);
  
  return { completed, incomplete };
};

// Helper function to get unit details by ID
export const getUnitById = async (unitId: string): Promise<Unit | null> => {
  try {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('id', unitId)
      .single();
    
    if (error) {
      logError('Failed to fetch unit', error);
      return null;
    }
    
    return data;
  } catch (error) {
    logError('Unexpected error fetching unit', error);
    return null;
  }
}; 