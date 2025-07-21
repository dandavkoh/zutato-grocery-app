import { supabase } from '../config/supabase';
import { logDebug, logError, logInfo } from '../config/environment';
import type { AuthError } from '@supabase/supabase-js';

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
  short: string; // Kurze Abkürzung, z.B. "Pkg"
}

export interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  icon?: string; // Font Awesome icon name (e.g., "fa-apple", "fa-bread-slice")
  unit_id?: string;
  quantity?: number;
  is_completed: boolean;
  is_deleted?: boolean;
  created_at: string;
  updatedAt: string;
  listId: string;
  addedBy: string;
  notes?: string;
  stores?: string[];
  assignedTo?: string[];
}

export interface CreateShoppingItemRequest {
  name: string;
  category: string;
  icon?: string;
  unit_id?: string;
  quantity?: number;
  listId: string;
  addedBy: string;
  notes?: string;
  stores?: string[];
  assignedTo?: string[];
}

export interface UpdateShoppingItemRequest {
  name?: string;
  category?: string;
  icon?: string;
  unit_id?: string;
  quantity?: number;
  is_completed?: boolean;
  is_deleted?: boolean;
  notes?: string;
  stores?: string[];
  assignedTo?: string[];
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
      
      logDebug('Successfully fetched items from Supabase', { 
        listId, 
        count: data?.length || 0 
      });
      
      return {
        data: data || [],
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error fetching items', error);
      return {
        data: null,
        error: 'Failed to fetch items',
        status: 500
      };
    }
  }

  // Get items by category
  async getItemsByCategory(listId: string, category: string): Promise<ApiResponse<ShoppingItem[]>> {
    try {
      logDebug('Fetching items by category from Supabase', { listId, category });
      
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('list_id', listId)
        .eq('category', category)
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
      
      logDebug('Successfully fetched items by category from Supabase', { 
        listId, 
        category,
        count: data?.length || 0 
      });
      
      return {
        data: data || [],
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error fetching items by category', error);
      return {
        data: null,
        error: 'Failed to fetch items by category',
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
      
      logDebug('Successfully fetched completed items from Supabase', { 
        listId, 
        count: data?.length || 0 
      });
      
      return {
        data: data || [],
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error fetching completed items', error);
      return {
        data: null,
        error: 'Failed to fetch completed items',
        status: 500
      };
    }
  }

  // Create new item
  async createItem(itemData: CreateShoppingItemRequest): Promise<ApiResponse<ShoppingItem>> {
    try {
      logDebug('Creating new item in Supabase', { name: itemData.name, listId: itemData.listId });
      
      const { data, error } = await supabase
        .from('shopping_items')
        .insert([{
          name: itemData.name,
          category: itemData.category,
          icon: itemData.icon,
          unit_id: itemData.unit_id,
          quantity: itemData.quantity,
          list_id: itemData.listId,
          added_by: itemData.addedBy,
          notes: itemData.notes,
          stores: itemData.stores,
          assigned_to: itemData.assignedTo,
          is_completed: false,
          deleted: false,
        }])
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
      
      // Transform Supabase data to ShoppingItem format
      const newItem: ShoppingItem = {
        id: data.id,
        name: data.name,
        category: data.category,
        icon: data.icon,
        unit_id: data.unit_id,
        quantity: data.quantity,
        is_completed: data.is_completed,
        is_deleted: data.is_deleted,
        created_at: data.created_at,
        updatedAt: data.updated_at,
        listId: data.list_id,
        addedBy: data.added_by,
        notes: data.notes,
        stores: data.stores,
        assignedTo: data.assigned_to,
      };
      
      logDebug('Successfully created item in Supabase', { itemId: newItem.id });
      
      return {
        data: newItem,
        error: null,
        status: 201
      };
    } catch (error) {
      logError('Unexpected error creating item', error);
      return {
        data: null,
        error: 'Failed to create item',
        status: 500
      };
    }
  }

  // Update item
  async updateItem(id: string, updates: UpdateShoppingItemRequest): Promise<ApiResponse<ShoppingItem>> {
    try {
      logDebug('Updating item in Supabase', { itemId: id, updates });
      
      const updateData: any = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.unit_id !== undefined) updateData.unit_id = updates.unit_id;
      if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
      if (updates.is_completed !== undefined) updateData.is_completed = updates.is_completed;
      if (updates.is_deleted !== undefined) updateData.is_deleted = updates.is_deleted;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.stores !== undefined) updateData.stores = updates.stores;
      if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo;
      
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
      
      if (!data) {
        return {
          data: null,
          error: 'Item not found',
          status: 404
        };
      }
      
      // Transform Supabase data to ShoppingItem format
      const updatedItem: ShoppingItem = {
        id: data.id,
        name: data.name,
        category: data.category,
        icon: data.icon,
        unit_id: data.unit_id,
        quantity: data.quantity,
        is_completed: data.is_completed,
        is_deleted: data.is_deleted,
        created_at: data.created_at,
        updatedAt: data.updated_at,
        listId: data.list_id,
        addedBy: data.added_by,
        notes: data.notes,
        stores: data.stores,
        assignedTo: data.assigned_to,
      };
      
      logDebug('Successfully updated item in Supabase', { itemId: updatedItem.id });
      
      return {
        data: updatedItem,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error updating item', error);
      return {
        data: null,
        error: 'Failed to update item',
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
      
      logDebug('Successfully deleted item in Supabase', { itemId: id });
      
      return {
        data: null,
        error: null,
        status: 204
      };
    } catch (error) {
      logError('Unexpected error deleting item', error);
      return {
        data: null,
        error: 'Failed to delete item',
        status: 500
      };
    }
  }

  // Toggle item completion
  async toggleItemCompletion(id: string): Promise<ApiResponse<ShoppingItem>> {
    try {
      logDebug('Toggling item completion in Supabase', { itemId: id });
      
      // First get current item to toggle the completion status
      const { data: currentItem, error: fetchError } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        logError('Failed to fetch item for toggle in Supabase', fetchError);
        return {
          data: null,
          error: fetchError.message,
          status: 500
        };
      }
      
      if (!currentItem) {
        return {
          data: null,
          error: 'Item not found',
          status: 404
        };
      }
      
      // Toggle completion status
      const { data, error } = await supabase
        .from('shopping_items')
        .update({ 
          is_completed: !currentItem.is_completed,
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        logError('Failed to toggle item completion in Supabase', error);
        return {
          data: null,
          error: error.message,
          status: 500
        };
      }
      
      // Transform Supabase data to ShoppingItem format
      const updatedItem: ShoppingItem = {
        id: data.id,
        name: data.name,
        category: data.category,
        icon: data.icon,
        unit_id: data.unit_id,
        quantity: data.quantity,
        is_completed: data.is_completed,
        is_deleted: data.is_deleted,
        created_at: data.created_at,
        updatedAt: data.updated_at,
        listId: data.list_id,
        addedBy: data.added_by,
        notes: data.notes,
        stores: data.stores,
        assignedTo: data.assigned_to,
      };
      
      logDebug('Successfully toggled item completion in Supabase', { 
        itemId: updatedItem.id, 
        isCompleted: updatedItem.is_completed 
      });
      
      return {
        data: updatedItem,
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error toggling item completion', error);
      return {
        data: null,
        error: 'Failed to toggle item completion',
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
      
      logDebug('Successfully searched items in Supabase', { 
        listId, 
        query,
        count: data?.length || 0 
      });
      
      return {
        data: data || [],
        error: null,
        status: 200
      };
    } catch (error) {
      logError('Unexpected error searching items', error);
      return {
        data: null,
        error: 'Failed to search items',
        status: 500
      };
    }
  }
}

// Auth Service Functions
export const authService = {
  // Register user
  async register(email: string, password: string, userData: { firstName: string; lastName: string }): Promise<AuthResponse> {
    try {
      logDebug('Registering user', { email, firstName: userData.firstName });
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
          }
        }
      });
      
      if (error) {
        logError('Registration failed', error);
        return { error };
      }
      
      if (data.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email!,
          firstName: userData.firstName,
          lastName: userData.lastName,
          emailVerified: data.user.email_confirmed_at !== null,
          created_at: data.user.created_at,
          updatedAt: data.user.updated_at,
        };
        
        logInfo('User registered successfully', { userId: authUser.id });
        return { user: authUser };
      }
      
      return { error: { message: 'Registration failed' } as AuthError };
    } catch (error) {
      logError('Unexpected registration error', error);
      return { error: { message: 'Registration failed' } as AuthError };
    }
  },

  // Login user
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      logDebug('Logging in user', { email });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        logError('Login failed', error);
        return { error };
      }
      
      if (data.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email!,
          firstName: data.user.user_metadata?.first_name,
          lastName: data.user.user_metadata?.last_name,
          emailVerified: data.user.email_confirmed_at !== null,
          created_at: data.user.created_at,
          updatedAt: data.user.updated_at,
        };
        
        logInfo('User logged in successfully', { userId: authUser.id });
        return { user: authUser };
      }
      
      return { error: { message: 'Login failed' } as AuthError };
    } catch (error) {
      logError('Unexpected login error', error);
      return { error: { message: 'Login failed' } as AuthError };
    }
  },

  // Reset password
  async resetPassword(email: string): Promise<AuthResponse> {
    try {
      logDebug('Resetting password', { email });
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        logError('Password reset failed', error);
        return { error };
      }
      
      logInfo('Password reset email sent', { email });
      return {};
    } catch (error) {
      logError('Unexpected password reset error', error);
      return { error: { message: 'Password reset failed' } as AuthError };
    }
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      logDebug('Logging out user');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        logError('Logout failed', error);
        throw error;
      }
      
      logInfo('User logged out successfully');
    } catch (error) {
      logError('Unexpected logout error', error);
      throw error;
    }
  },

  // Get current user
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        logError('Failed to get current user', error);
        return null;
      }
      
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

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
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
  }
};

// Database Service Functions
export const shoppingItemsApi = new ShoppingItemsController();

// Helper function to group items by category
export const groupItemsByCategory = (items: ShoppingItem[]) => {
  const grouped: { [category: string]: ShoppingItem[] } = {};
  
  const activeItems = items.filter(item => !item.is_deleted);
  
  activeItems.forEach(item => {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  });
  
  return grouped;
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